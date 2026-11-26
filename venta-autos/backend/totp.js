import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { requireValue, sealRequest, transaction, unsealRequest, verifyPassword } from './core.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_MS = 30_000;

function base32(bytes) {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(value >>> bits) & 31];
    }
  }
  if (bits) result += BASE32[(value << (5 - bits)) & 31];
  return result;
}

export function totpCode(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', secret).update(counter).digest();
  const offset = digest.at(-1) & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

export function matchingStep(secret, code, lastStep, now = Date.now()) {
  const current = Math.floor(now / STEP_MS);
  const input = Buffer.from(code);
  for (const step of [current, current - 1, current + 1]) {
    if (step >= 0 && step > Number(lastStep ?? -1)
      && timingSafeEqual(input, Buffer.from(totpCode(secret, step)))) return step;
  }
  return null;
}

function totpVaultKey(serverSecret, userId) {
  return createHmac('sha256', serverSecret).update(`autopremium:totp:${userId}`).digest('hex');
}

async function lockFactor(db, userId) {
  return (await db.query('SELECT * FROM auth_totp WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
}

function factorStep(factor, userId, code, serverSecret) {
  const secret = unsealRequest(factor.secret, totpVaultKey(serverSecret, userId));
  return matchingStep(Buffer.from(secret, 'base64'), code, factor.last_step);
}

export async function verifyAuthenticator(db, userId, code, serverSecret) {
  const factor = await lockFactor(db, userId);
  if (!factor?.enabled_at) return false;
  const step = factorStep(factor, userId, code, serverSecret);
  if (step === null) return false;
  await db.query('UPDATE auth_totp SET last_step=$2 WHERE user_id=$1', [userId, step]);
  return true;
}

export function registerTotpRoutes(app, { pool, authenticate, limitLogin, serverSecret }) {
  app.get('/api/auth/autenticador', authenticate, async (req, res) => {
    const result = await pool.query('SELECT 1 FROM auth_totp WHERE user_id=$1 AND enabled_at IS NOT NULL', [req.user.id]);
    res.json({ enabled: result.rowCount > 0 });
  });

  app.post('/api/auth/autenticador', limitLogin, authenticate, async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    requireValue(req.authSession, 401, 'Vuelve a iniciar sesión para configurar la app autenticadora.');
    requireValue(typeof password === 'string' && password.length > 0 && password.length <= 256, 400, 'Escribe tu contraseña.');
    const user = (await pool.query('SELECT password_hash FROM usuarios WHERE id=$1', [userId])).rows[0];
    requireValue(user && await verifyPassword(password, user.password_hash), 403, 'La contraseña es incorrecta.');

    const secret = randomBytes(20);
    const manualKey = base32(secret);
    const params = new URLSearchParams({ secret: manualKey, issuer: 'AutoPremium', algorithm: 'SHA1', digits: '6', period: '30' });
    const qr = await QRCode.toDataURL(`otpauth://totp/AutoPremium:${encodeURIComponent(req.user.email)}?${params}`, { width: 280 });
    const encrypted = sealRequest(secret.toString('base64'), totpVaultKey(serverSecret, userId));
    const pending = await pool.query(`INSERT INTO auth_totp(user_id,secret,setup_session_id,setup_expires_at)
      VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes') ON CONFLICT(user_id) DO UPDATE SET
      secret=EXCLUDED.secret,setup_session_id=EXCLUDED.setup_session_id,setup_expires_at=EXCLUDED.setup_expires_at,setup_attempts=0
      WHERE auth_totp.enabled_at IS NULL`, [userId, encrypted, req.authSession.id]);
    requireValue(pending.rowCount === 1, 409, 'La app autenticadora ya está activada.');
    res.json({ qr, manualKey });
  });

  app.post('/api/auth/autenticador/confirmar', limitLogin, authenticate, async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;
    requireValue(req.authSession, 401, 'Vuelve a iniciar sesión para configurar la app autenticadora.');
    requireValue(typeof code === 'string' && /^\d{6}$/.test(code), 400, 'Escribe el código de seis dígitos.');
    const enabled = await transaction(pool, async db => {
      const factor = await lockFactor(db, userId);
      if (factor?.enabled_at) return true;
      requireValue(factor?.setup_session_id === req.authSession.id && new Date(factor.setup_expires_at).getTime() > Date.now()
        && factor.setup_attempts < 5, 410, 'La configuración venció. Genera un QR nuevo.');
      const step = factorStep(factor, userId, code, serverSecret);
      if (step === null) {
        await db.query('UPDATE auth_totp SET setup_attempts=setup_attempts+1 WHERE user_id=$1', [userId]);
        return false;
      }
      await db.query(`UPDATE auth_totp SET enabled_at=NOW(),last_step=$2,setup_session_id=NULL,
        setup_expires_at=NULL,setup_attempts=0 WHERE user_id=$1`, [userId, step]);
      return true;
    });
    requireValue(enabled, 400, 'El código no coincide. Revisa la app y vuelve a intentarlo.');
    res.json({ enabled: true });
  });
}
