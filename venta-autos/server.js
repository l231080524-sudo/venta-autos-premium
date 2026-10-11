import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { readConfig, createMercadoPago } from './backend/config.js';
import { createCheckout } from './backend/checkout.js';
import { cents, requireValue, transaction, hashPassword, verifyPassword, sessionToken, sessionUser } from './backend/core.js';

// Copia las variables de .env.example a tu .env privado; en Render usa Environment.
// Nunca pegues claves en este archivo. Las migraciones SQL se ejecutan por separado.
dotenv.config();
export function createApp({ pool, config = readConfig(), mp = createMercadoPago(config) }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.origins, methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'], exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  const authenticate = async (req,res,next) => {
    requireValue(config.authSecret.length >= 32, 503, 'Falta configurar AUTH_SECRET en el servidor.');
    const id = sessionUser(req.get('Authorization')?.replace(/^Bearer /,'') || '', config.authSecret);
    requireValue(id, 401, 'Tu sesión venció. Vuelve a iniciar sesión.');
    const user = (await pool.query('SELECT id,nombre,email,rol,telefono FROM usuarios WHERE id=$1',[id])).rows[0];
    requireValue(user, 401, 'La cuenta ya no está disponible.');
    req.user = user; next();
  };
  const admin = [authenticate, (req,res,next) => {
    requireValue(['admin','superadmin'].includes(req.user.rol),403,'Se requiere una cuenta administradora.'); next();
  }];
  const userAdmin = [authenticate, (req,res,next) => {
    requireValue(['admin','superadmin','admin_restringido'].includes(req.user.rol),403,'Se requiere una cuenta administradora.'); next();
  }];
  const publicUser = user => ({ id:user.id,nombre:user.nombre,email:user.email,rol:user.rol,token:sessionToken(user.id,config.authSecret) });
  const attempts = new Map();
  const limitLogin = (req,res,next) => {
    const now=Date.now();
    for (const [key,value] of attempts) if (value.until <= now) attempts.delete(key);
    const entry=attempts.get(req.ip) || { count:0,until:now+60000 };
    entry.count++; attempts.set(req.ip,entry);
    requireValue(entry.count<=30,429,'Demasiados intentos. Espera un minuto.'); next();
  };
  app.get('/api/health',async (_req,res) => { await pool.query('SELECT 1'); res.json({ok:true}); });
  app.post('/api/auth/login',limitLogin,async (req,res) => {
    requireValue(config.authSecret.length>=32,503,'Falta configurar AUTH_SECRET en el servidor.');
    const {email,password}=req.body;
    requireValue(typeof email==='string' && typeof password==='string' && password.length<=256,400,'Datos de acceso inválidos.');
    const user=(await pool.query('SELECT * FROM usuarios WHERE lower(email)=lower($1)',[email.trim()])).rows[0];
    requireValue(user && await verifyPassword(password,user.password_hash),401,'Correo o contraseña incorrectos.');
    if (!user.password_hash.startsWith('scrypt:')) await pool.query('UPDATE usuarios SET password_hash=$2 WHERE id=$1',[user.id,await hashPassword(password)]);
    res.json(publicUser(user));
  });
  app.post('/api/auth/registro',limitLogin,async (req,res) => {
    requireValue(config.authSecret.length>=32,503,'Falta configurar AUTH_SECRET en el servidor.');
    const {nombre,email,password,telefono}=req.body;
    requireValue(typeof nombre==='string' && nombre.trim().length>0 && nombre.length<=100
      && typeof email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=150
      && typeof password==='string' && password.length>=8 && password.length<=256
      && typeof telefono==='string' && telefono.length<=20,400,'Revisa tus datos. La contraseña debe tener al menos 8 caracteres.');
    // El correo nunca concede privilegios: el rol se obtiene de PostgreSQL.
    const user=(await pool.query(`INSERT INTO usuarios(nombre,email,password_hash,rol,telefono)
      VALUES($1,$2,$3,'cliente',$4) RETURNING id,nombre,email,rol`,[nombre.trim(),email.trim().toLowerCase(),await hashPassword(password),telefono])).rows[0];
    res.status(201).json(publicUser(user));
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
      ingresosEstimados:0}); // Sandbox no constituye un ingreso real.
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
  // Esta ruta antigua jamás volverá a marcar pagos como realizados.
  app.post('/api/apartados/pagar',(_req,res)=>res.status(410).json({error:'El pago simulado fue retirado. Usa Mercado Pago.'}));
  app.use('/api/mercadopago',createCheckout({pool,config,mp,authenticate}));
  app.use((error,_req,res,_next)=> {
    const messages={'23505':'El registro ya existe.','23503':'No se puede eliminar un registro vinculado a compras.',
      '42P01':'Falta ejecutar las migraciones de pagos.','42703':'Falta completar las migraciones de pagos.'};
    const status=error.status || (messages[error.code] ? 409 : 500);
    if (status>=500) console.error('Error API:',error.code || error.name);
    res.status(status).json({error:error.status ? error.message : messages[error.code] || 'No se pudo completar la operación.'});
  });
  return app;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.');
  const hostname=new URL(process.env.DATABASE_URL).hostname;
  // Neon: utiliza su URL con sslmode=require. Local: sin SSL.
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,...(['localhost','127.0.0.1'].includes(hostname)?{ssl:false}:{})});
  const server=createApp({pool}).listen(process.env.PORT || 3000,()=>console.log('API AutoPremium iniciada.'));
  process.on('SIGTERM',()=>server.close(()=>pool.end()));
}
