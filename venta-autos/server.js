import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readConfig, createMercadoPago } from './backend/config.js';
import { createCheckout } from './backend/checkout.js';
import { createChat } from './backend/chat.js';
import { cents, requireValue, transaction, hashPassword, verifyPassword, sessionToken, sessionClaims } from './backend/core.js';
import { AUTH_OTP_MAX_ATTEMPTS, AUTH_SESSION_IDLE_MS, AUTH_SESSION_MAX_MS, createAuthDelivery, createOtpChallenge, normalizePhone, otpMatches } from './backend/auth.js';
import { registerTotpRoutes, verifyAuthenticator } from './backend/totp.js';
import { crearCaptchaTexto } from './backend/captchaTexto.js';

const AUTH_FAILURE_LIMIT = 5;
const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LOCK_MS = 30_000;
const AUTH_LOCK_MESSAGE = 'La cuenta está bloqueada temporalmente. Espera 30 segundos antes de intentarlo de nuevo.';

function locked(user, now = Date.now()) {
  return Boolean(user?.auth_bloqueado_hasta && new Date(user.auth_bloqueado_hasta).getTime() > now);
}

async function recordAuthFailure(db, user, now = Date.now()) {
  if (locked(user, now)) return true;
  const started = user.auth_ventana ? new Date(user.auth_ventana).getTime() : 0;
  const inWindow = !user.auth_bloqueado_hasta && started > now - AUTH_FAILURE_WINDOW_MS;
  const failures = inWindow ? Number(user.auth_fallos || 0) + 1 : 1;
  const windowStart = inWindow ? new Date(user.auth_ventana) : new Date(now);
  const blockedUntil = failures >= AUTH_FAILURE_LIMIT ? new Date(now + AUTH_LOCK_MS) : null;
  await db.query('UPDATE usuarios SET auth_fallos=$2,auth_ventana=$3,auth_bloqueado_hasta=$4 WHERE id=$1',
    [user.id, failures, windowStart, blockedUntil]);
  if (blockedUntil) await db.query('UPDATE auth_challenges SET consumed_at=NOW() WHERE user_id=$1 AND consumed_at IS NULL', [user.id]);
  return Boolean(blockedUntil);
}

async function makeSession(pool, user, secret, now = Date.now()) {
  const sessionId = randomUUID();
  const expiresAt = new Date(now + AUTH_SESSION_MAX_MS);
  await pool.query('INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,$3)', [sessionId, user.id, expiresAt]);
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    token: sessionToken(user.id, secret, now, sessionId, AUTH_SESSION_MAX_MS),
    expiresAt: expiresAt.toISOString(),
    idleTimeoutSeconds: AUTH_SESSION_IDLE_MS / 1000,
  };
}

dotenv.config();
export function createApp({ pool, config = readConfig(), mp = createMercadoPago(config), authDelivery = createAuthDelivery(), captchaTexto = crearCaptchaTexto() }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.origins, methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'], exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  app.use('/api/chat', createChat({ pool }));
  const authenticate = async (req,res,next) => {
    requireValue(config.authSecret.length >= 32, 503, 'Falta configurar AUTH_SECRET en el servidor.');
    const claims = sessionClaims(req.get('Authorization')?.replace(/^Bearer /,'') || '', config.authSecret);
    requireValue(claims, 401, 'Tu sesión venció. Vuelve a iniciar sesión.');
    if (claims.sessionId) {
      const active = (await pool.query(`UPDATE auth_sessions SET last_seen_at=NOW()
        WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>NOW()
          AND last_seen_at>NOW()-($3::integer * INTERVAL '1 second') RETURNING id`, [claims.sessionId, claims.userId, AUTH_SESSION_IDLE_MS / 1000])).rows[0];
      requireValue(active, 401, 'Tu sesión venció por inactividad. Vuelve a iniciar sesión.');
      req.authSession = active;
    }
    const user = (await pool.query('SELECT id,nombre,email,rol,telefono FROM usuarios WHERE id=$1',[claims.userId])).rows[0];
    requireValue(user, 401, 'La cuenta ya no está disponible.');
    req.user = user; next();
  };
  const admin = [authenticate, (req,res,next) => {
    requireValue(['admin','superadmin'].includes(req.user.rol),403,'Se requiere una cuenta administradora.'); next();
  }];
  const userAdmin = [authenticate, (req,res,next) => {
    requireValue(['admin','superadmin','admin_restringido'].includes(req.user.rol),403,'Se requiere una cuenta administradora.'); next();
  }];
  const startChallenge = async (user, purpose, channel) => createOtpChallenge({
    pool, delivery:authDelivery, user, purpose, channel, secret:config.authSecret,
  });
  function limitarIntentos() {
    const attempts = new Map();
    return (req, _res, next) => {
      const now = Date.now();
      for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
      const entry = attempts.get(req.ip) || { count: 0, until: now + 60_000 };
      entry.count++;
      attempts.set(req.ip, entry);
      requireValue(entry.count <= 30, 429, 'Demasiados intentos. Espera un minuto.');
      next();
    };
  }
  const limitLogin = limitarIntentos();
  const limitCaptcha = limitarIntentos();
  app.get('/api/health',async (_req,res) => { await pool.query('SELECT 1'); res.json({ok:true}); });
  registerTotpRoutes(app, { pool, authenticate, limitLogin, serverSecret: config.authSecret });
  app.post('/api/auth/heartbeat',authenticate,(_req,res) => res.json({ ok:true }));
  app.post('/api/auth/logout',authenticate,async (req,res) => {
    if (req.authSession) await pool.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1', [req.authSession.id]);
    res.json({ ok:true });
  });
  app.get('/api/auth/captcha/texto', limitCaptcha, (_req, res) => res.json(captchaTexto.emitir()));
  app.get('/api/auth/captcha/texto/:id/audio', limitCaptcha, (req, res) => {
    res.type('audio/wav').send(captchaTexto.audio(req.params.id));
  });
  app.post('/api/auth/login',limitLogin,async (req,res) => {
    requireValue(config.authSecret.length>=32,503,'Falta configurar AUTH_SECRET en el servidor.');
    const {email,password,method='email'}=req.body;
    requireValue(typeof email==='string' && typeof password==='string' && password.length<=256,400,'Datos de acceso inválidos.');
    requireValue(['email','totp'].includes(method),400,'Selecciona un método de verificación válido.');
    captchaTexto.validar(req.body.captcha);
    const user=(await pool.query('SELECT * FROM usuarios WHERE lower(email)=lower($1)',[email.trim()])).rows[0];
    if (user && locked(user)) requireValue(false,423,AUTH_LOCK_MESSAGE);
    const passwordValid = user && await verifyPassword(password,user.password_hash);
    if (!passwordValid) {
      if (user) {
        const result = await transaction(pool, async db => {
          const current=(await db.query('SELECT id,auth_fallos,auth_ventana,auth_bloqueado_hasta FROM usuarios WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
          return recordAuthFailure(db,current);
        });
        if (result) requireValue(false,423,AUTH_LOCK_MESSAGE);
      }
      requireValue(false,401,'Correo o contraseña incorrectos.');
    }
    if (!user.password_hash.startsWith('scrypt:')) await pool.query('UPDATE usuarios SET password_hash=$2 WHERE id=$1',[user.id,await hashPassword(password)]);
    const purpose = user.correo_verificado ? 'login' : 'verify_email';
    const channel = purpose === 'verify_email' ? 'email' : method;
    const challenge = await startChallenge(user,purpose,channel);
    res.json({ requiereCodigo:true, requiereVerificacion:purpose==='verify_email', ...challenge });
  });
  app.post('/api/auth/registro',limitLogin,async (req,res) => {
    requireValue(config.authSecret.length>=32,503,'Falta configurar AUTH_SECRET en el servidor.');
    const {nombre,email,password,telefono}=req.body;
    requireValue(typeof nombre==='string' && nombre.trim().length>0 && nombre.length<=100
      && typeof email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=150
      && typeof password==='string' && password.length>=8 && password.length<=256
      && typeof telefono==='string' && telefono.length<=30,400,'Revisa tus datos. La contraseña debe tener al menos 8 caracteres.');
    const telefonoNormalizado=normalizePhone(telefono);
    let user;
    try {
      user=(await pool.query(`INSERT INTO usuarios(nombre,email,password_hash,rol,telefono,correo_verificado)
        VALUES($1,$2,$3,'cliente',$4,FALSE) RETURNING id,nombre,email,rol,telefono,correo_verificado`,
      [nombre.trim(),email.trim().toLowerCase(),await hashPassword(password),telefonoNormalizado])).rows[0];
    } catch (error) {
      if (error.code!=='23505') throw error;
      user=(await pool.query('SELECT * FROM usuarios WHERE lower(email)=lower($1)',[email.trim()])).rows[0];
      requireValue(user && !user.correo_verificado && await verifyPassword(password,user.password_hash),409,'Ese correo ya tiene una cuenta. Inicia sesión o recupera el acceso.');
    }
    const challenge=await startChallenge(user,'verify_email','email');
    res.status(201).json({ requiereCodigo:true, requiereVerificacion:true, ...challenge });
  });
  app.post('/api/auth/verificar',limitLogin,async (req,res) => {
    requireValue(config.authSecret.length>=32,503,'Falta configurar AUTH_SECRET en el servidor.');
    const {challengeId,code}=req.body;
    requireValue(typeof challengeId==='string' && /^[0-9a-f-]{36}$/i.test(challengeId)
      && typeof code==='string' && /^\d{6}$/.test(code),400,'Escribe el código de seis dígitos.');
    const result=await transaction(pool,async db => {
      await db.query('SELECT id FROM usuarios WHERE id=(SELECT user_id FROM auth_challenges WHERE id=$1) FOR UPDATE', [challengeId]);
      const row=(await db.query(`SELECT c.*,u.id AS account_id,u.nombre,u.email,u.rol,u.telefono,u.correo_verificado,
        u.auth_fallos,u.auth_ventana,u.auth_bloqueado_hasta
        FROM auth_challenges c JOIN usuarios u ON u.id=c.user_id
        WHERE c.id=$1 FOR UPDATE OF c`,[challengeId])).rows[0];
      if (!row || !['email','totp'].includes(row.channel) || row.consumed_at || new Date(row.expires_at).getTime()<=Date.now() || Number(row.attempts)>=AUTH_OTP_MAX_ATTEMPTS)
        return { ok:false };
      if (row.purpose==='login' && locked(row)) return { ok:false, locked:true };
      const matches = row.channel === 'totp'
        ? await verifyAuthenticator(db, row.account_id, code, config.authSecret)
        : otpMatches(challengeId,code,row.code_hash,config.authSecret);
      if (!matches) {
        const attempts=Number(row.attempts)+1;
        await db.query('UPDATE auth_challenges SET attempts=$2::smallint,consumed_at=CASE WHEN $2::smallint >= $3::smallint THEN NOW() ELSE consumed_at END WHERE id=$1',
          [challengeId,attempts,AUTH_OTP_MAX_ATTEMPTS]);
        const account={id:row.account_id,auth_fallos:row.auth_fallos,auth_ventana:row.auth_ventana,auth_bloqueado_hasta:row.auth_bloqueado_hasta};
        const isLocked=row.purpose==='login' && await recordAuthFailure(db,account);
        return { ok:false, locked:isLocked, usesAuthenticator:row.channel==='totp' };
      }
      await db.query('UPDATE auth_challenges SET consumed_at=NOW() WHERE id=$1',[challengeId]);
      if (row.purpose==='verify_email') await db.query('UPDATE usuarios SET correo_verificado=TRUE WHERE id=$1',[row.account_id]);
      if (row.purpose==='login') {
        await db.query('UPDATE usuarios SET auth_fallos=0,auth_ventana=NULL,auth_bloqueado_hasta=NULL WHERE id=$1',[row.account_id]);
      }
      const user=(await db.query('SELECT id,nombre,email,rol FROM usuarios WHERE id=$1',[row.account_id])).rows[0];
      return { ok:true,user };
    });
    if (!result.ok) requireValue(false,result.locked?423:401,result.locked?AUTH_LOCK_MESSAGE
      : result.usesAuthenticator ? 'El código no es válido o ya se usó. Espera el siguiente código de la app.'
        : 'El código no es válido o ya venció. Inicia la verificación de nuevo.');
    res.json({ usuario:await makeSession(pool,result.user,config.authSecret) });
  });
  app.post('/api/auth/reenviar-codigo',limitLogin,async (req,res) => {
    const {challengeId}=req.body;
    requireValue(typeof challengeId==='string' && /^[0-9a-f-]{36}$/i.test(challengeId),400,'La solicitud de verificación no es válida.');
    const row=(await pool.query(`SELECT c.*,u.id AS account_id,u.email,u.auth_bloqueado_hasta
      FROM auth_challenges c JOIN usuarios u ON u.id=c.user_id WHERE c.id=$1`,[challengeId])).rows[0];
    requireValue(row && !row.consumed_at && new Date(row.expires_at).getTime()>Date.now(),410,'El código venció. Inicia sesión para solicitar uno nuevo.');
    requireValue(row.channel!=='totp',400,'Usa el código actual de tu app autenticadora.');
    requireValue(row.channel==='email',410,'Inicia sesión para solicitar un código por correo.');
    if (row.purpose==='login' && locked(row)) requireValue(false,423,AUTH_LOCK_MESSAGE);
    requireValue(Date.now()-new Date(row.created_at).getTime()>=60000,429,'Espera un minuto antes de pedir otro código.');
    const user={id:row.account_id,email:row.email};
    res.json(await startChallenge(user,row.purpose,row.channel));
  });
  app.get('/api/vehiculos',async (_req,res) => res.json((await pool.query('SELECT * FROM vehiculos ORDER BY precio')).rows));
  app.post('/api/vehiculos',...admin,async (req,res) => {
    const {marca,modelo,anio,precio,categoria,imagen,descripcion,stock,especificaciones}=req.body;
    requireValue(cents(precio)>0,400,'El precio debe ser mayor que cero y tener como máximo dos decimales.');
    await pool.query(`INSERT INTO vehiculos(marca,modelo,anio,precio,categoria,imagen,descripcion,stock,especificaciones)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[marca,modelo,anio,precio,categoria,imagen,descripcion,stock,especificaciones]);
    res.status(201).json({success:true});
  });
  app.put('/api/vehiculos/:id',...admin,async (req,res) => {
    const allowed=['marca','modelo','anio','precio','categoria','imagen','descripcion','stock','especificaciones'];
    if (Object.hasOwn(req.body,'precio')) requireValue(cents(req.body.precio)>0,400,'El precio debe ser mayor que cero y tener como máximo dos decimales.');
    const keys=Object.keys(req.body);
    requireValue(keys.length && keys.every(key=>allowed.includes(key)),400,'Campos de vehículo inválidos.');
    await pool.query(`UPDATE vehiculos SET ${keys.map((key,i)=>`${key}=$${i+2}`).join(',')} WHERE id=$1`,[req.params.id,...keys.map(key=>req.body[key])]);
    res.json({success:true});
  });
  app.delete('/api/vehiculos/:id',...admin,async (req,res) => {
    await transaction(pool,async db=> {
      await db.query('DELETE FROM apartados WHERE vehiculo_id=$1',[req.params.id]);
      await db.query('DELETE FROM vehiculos WHERE id=$1',[req.params.id]);
    }); res.json({success:true});
  });
  app.get('/api/usuarios',...userAdmin,async (_req,res)=>res.json((await pool.query('SELECT id,nombre,email,rol,telefono,compras_totales FROM usuarios ORDER BY id DESC')).rows));
  app.post('/api/usuarios/admin',...admin,async (req,res)=> {
    const {nombre,email,password}=req.body;
    requireValue(typeof email==='string' && email.toLowerCase().endsWith('@autopremium.com')
      && typeof password==='string' && password.length>=8 && password.length<=256,400,'Revisa correo institucional y contraseña (mínimo 8 caracteres).');
    await pool.query("INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES($1,$2,$3,'admin')",[nombre,email.toLowerCase(),await hashPassword(password)]);
    res.status(201).json({success:true});
  });
  app.put('/api/usuarios/:id',...admin,async (req,res)=> {
    const {nombre,rol}=req.body;
    requireValue(!rol || ['cliente','admin','superadmin','admin_restringido'].includes(rol),400,'Rol inválido.');
    await transaction(pool,async db=> {
      const target=(await db.query('SELECT rol FROM usuarios WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      requireValue(target,404,'Usuario no encontrado.');
      requireValue(req.user.rol==='superadmin' || (target.rol==='cliente' && (!rol || rol==='cliente')),403,'Solo el superadministrador puede modificar privilegios.');
      await db.query('UPDATE usuarios SET nombre=COALESCE($2,nombre),rol=COALESCE($3,rol) WHERE id=$1',[req.params.id,nombre,rol]);
    });
    res.json({success:true});
  });
  app.delete('/api/usuarios/:id',...userAdmin,async (req,res)=> {
    requireValue(String(req.user.id)!==req.params.id,400,'No puedes eliminar tu propia cuenta.');
    await transaction(pool,async db=> {
      const target=(await db.query('SELECT rol,compras_totales FROM usuarios WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      requireValue(target,404,'Usuario no encontrado.');
      requireValue(req.user.rol==='superadmin' || target.rol==='cliente',403,'Solo el superadministrador puede revocar administradores.');
      requireValue(target.rol!=='cliente' || Number(target.compras_totales || 0)===0,409,'No se puede eliminar un cliente con compras.');
      await db.query('DELETE FROM apartados WHERE usuario_id=$1',[req.params.id]);
      await db.query('DELETE FROM usuarios WHERE id=$1',[req.params.id]);
    }); res.json({success:true});
  });
  app.get('/api/admin/metricas',...admin,async (_req,res)=> {
    const inventory=(await pool.query('SELECT COALESCE(SUM(stock),0) AS stock, COALESCE(SUM(stock*precio),0) AS valor FROM vehiculos')).rows[0];
    res.json({stockTotal:Number(inventory.stock),valorInventario:Number(inventory.valor),
      unidadesEntregadas:Number((await pool.query('SELECT COALESCE(SUM(compras_totales),0) AS total FROM usuarios')).rows[0].total),
      ingresosEstimados:0});
  });
  app.get('/api/apartados',authenticate,async (req,res)=> {
    res.json((await pool.query(`SELECT a.id,v.marca,v.modelo,v.precio,v.categoria,v.imagen FROM apartados a
      JOIN vehiculos v ON v.id=a.vehiculo_id WHERE a.usuario_id=$1 AND a.status='apartado' ORDER BY a.id`,[req.user.id])).rows);
  });
  app.post('/api/apartados',authenticate,async (req,res)=> {
    const {vehiculo_id}=req.body;
    requireValue(Number.isSafeInteger(vehiculo_id),400,'Vehículo inválido.');
    await transaction(pool,async db=> {
      const car=(await db.query('SELECT stock FROM vehiculos WHERE id=$1 FOR UPDATE',[vehiculo_id])).rows[0];
      requireValue(car?.stock>0,409,'Sin existencias.');
      await db.query("INSERT INTO apartados(usuario_id,vehiculo_id,status) VALUES($1,$2,'apartado')",[req.user.id,vehiculo_id]);
    }); res.status(201).json({success:true});
  });
  app.delete('/api/apartados/:id',authenticate,async (req,res)=> {
    await transaction(pool,async db=> {
      await db.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[req.user.id]);
      const active=await db.query(`SELECT 1 FROM orden_detalles d JOIN ordenes o ON o.id=d.orden_id
        WHERE d.apartado_id=$1 AND o.estado='pendiente'`,[req.params.id]);
      requireValue(!active.rows.length,409,'Hay una orden pendiente. Revisa su estado en el historial.');
      const deleted=await db.query('DELETE FROM apartados WHERE id=$1 AND usuario_id=$2 RETURNING id',[req.params.id,req.user.id]);
      requireValue(deleted.rows.length,404,'Apartado no encontrado.');
    }); res.json({success:true});
  });
  app.post('/api/apartados/pagar',(_req,res)=>res.status(410).json({error:'El pago simulado fue retirado. Usa Mercado Pago.'}));
  app.use('/api/mercadopago',createCheckout({pool,config,mp,authenticate}));
  app.use((error,_req,res,_next)=> {
      const messages={'23505':'El registro ya existe.','23503':'No se puede eliminar un registro vinculado a compras.',
        '42P01':'Falta ejecutar una migración de base de datos.','42703':'Falta completar una migración de base de datos.'};
    const status=error.status || (messages[error.code] ? 409 : 500);
    if (status>=500) console.error('Error API:',error.code || error.name);
    res.status(status).json({error:error.status ? error.message : messages[error.code] || 'No se pudo completar la operación.'});
  });
  return app;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.');
  const hostname=new URL(process.env.DATABASE_URL).hostname;
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,...(['localhost','127.0.0.1'].includes(hostname)?{ssl:false}:{})});
  const server=createApp({pool}).listen(process.env.PORT || 3000,()=>console.log('API AutoPremium iniciada.'));
  process.on('SIGTERM',()=>server.close(()=>pool.end()));
}
