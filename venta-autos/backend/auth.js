import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { requireValue, transaction } from './core.js';

export const AUTH_SESSION_IDLE_MS = 30 * 60 * 1000;
export const AUTH_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
export const AUTH_OTP_TTL_MS = 10 * 60 * 1000;
export const AUTH_OTP_MAX_ATTEMPTS = 5;

export function normalizePhone(value) {
  requireValue(typeof value === 'string', 400, 'Registra un teléfono celular válido para usar SMS.');
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `52${digits}`;
  else if (digits.length === 13 && digits.startsWith('521')) digits = `52${digits.slice(-10)}`;
  requireValue(digits.length >= 8 && digits.length <= 15, 400, 'Registra un teléfono celular válido para usar SMS.');
  return `+${digits}`;
}

export function maskDestination(channel, value) {
  if (channel === 'email') {
    const [name = '', domain = ''] = value.split('@');
    return `${name.slice(0, 1)}${'*'.repeat(Math.max(3, Math.min(name.length - 1, 8)))}@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return `•••• ${digits.slice(-4)}`;
}

export function otpDigest(challengeId, code, secret) {
  return createHmac('sha256', secret).update(`autopremium-otp:${challengeId}:${code}`).digest();
}

export function otpMatches(challengeId, code, storedHash, secret) {
  try {
    const expected = Buffer.from(storedHash, 'hex');
    const actual = otpDigest(challengeId, code, secret);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export function createAuthDelivery({ env = process.env, fetcher = fetch } = {}) {
  async function sendEmail(to, code, purpose) {
    if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) {
      throw Object.assign(new Error('El envío de códigos por correo todavía no está configurado.'), { status: 503 });
    }
    let response;
    try {
      response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.AUTH_EMAIL_FROM,
          to: [to],
          subject: purpose === 'verify_email' ? 'Verifica tu cuenta de AutoPremium' : 'Código de acceso a AutoPremium',
          text: `Tu código de verificación es ${code}. Vence en 10 minutos. Si no solicitaste este código, ignora este mensaje.`,
          html: `<p>Tu código de verificación es:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Vence en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>`,
        }),
      });
    } catch {
      throw Object.assign(new Error('No se pudo enviar el correo de verificación. Inténtalo de nuevo.'), { status: 503 });
    }
    if (!response.ok) throw Object.assign(new Error('El proveedor de correo no pudo enviar el código.'), { status: 503 });
  }

  async function sendSms(to, code) {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !from) {
      throw Object.assign(new Error('El envío de códigos por SMS todavía no está configurado.'), { status: 503 });
    }
    let response;
    try {
      const body = new URLSearchParams({ To: to, From: from, Body: `Tu código de AutoPremium es ${code}. Vence en 10 minutos.` });
      response = await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch {
      throw Object.assign(new Error('No se pudo enviar el SMS de verificación. Inténtalo de nuevo.'), { status: 503 });
    }
    if (!response.ok) throw Object.assign(new Error('El proveedor de SMS no pudo enviar el código.'), { status: 503 });
  }

  return {
    send: (channel, destination, code, purpose) => channel === 'email'
      ? sendEmail(destination, code, purpose)
      : sendSms(destination, code),
  };
}

export async function createOtpChallenge({ pool, delivery, user, channel, purpose, secret, now = Date.now() }) {
  requireValue(['email', 'sms'].includes(channel), 400, 'Selecciona un método de verificación válido.');
  requireValue(['verify_email', 'login'].includes(purpose), 400, 'No se pudo iniciar la verificación.');
  const destination = channel === 'email' ? user.email : normalizePhone(user.telefono || '');
  const id = randomUUID();
  const code = String(randomInt(100000, 1000000));
  await transaction(pool, async db => {
    await db.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [user.id]);
    const { rows: counts } = await db.query(
      `SELECT COUNT(*)::int AS count FROM auth_challenges
       WHERE user_id=$1 AND purpose=$2 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [user.id, purpose],
    );
    requireValue(Number(counts[0]?.count || 0) < 5, 429, 'Solicitaste varios códigos. Espera 15 minutos antes de pedir otro.');
    await db.query(
      `UPDATE auth_challenges SET consumed_at=NOW()
       WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL`, [user.id, purpose],
    );
    await db.query(
      `INSERT INTO auth_challenges(id,user_id,purpose,channel,code_hash,expires_at)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [id, user.id, purpose, channel, otpDigest(id, code, secret).toString('hex'), new Date(now + AUTH_OTP_TTL_MS)],
    );
  });
  try {
    await delivery.send(channel, destination, code, purpose);
  } catch (error) {
    await pool.query('UPDATE auth_challenges SET consumed_at=NOW() WHERE id=$1', [id]);
    throw error;
  }
  return {
    challengeId: id,
    method: channel,
    destination: maskDestination(channel, destination),
    expiresInSeconds: AUTH_OTP_TTL_MS / 1000,
  };
}
