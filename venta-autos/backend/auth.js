import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { requireValue, transaction } from './core.js';

export const AUTH_SESSION_IDLE_MS = 60 * 1000;
export const AUTH_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
export const AUTH_OTP_TTL_MS = 10 * 60 * 1000;
export const AUTH_OTP_MAX_ATTEMPTS = 5;

export function normalizePhone(value) {
  requireValue(typeof value === 'string', 400, 'Registra un teléfono celular válido.');
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `52${digits}`;
  else if (digits.length === 13 && digits.startsWith('521')) digits = `52${digits.slice(-10)}`;
  requireValue(digits.length >= 8 && digits.length <= 15, 400, 'Registra un teléfono celular válido.');
  return `+${digits}`;
}

export function maskEmail(value) {
  const [name = '', domain = ''] = value.split('@');
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(3, Math.min(name.length - 1, 8)))}@${domain}`;
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
  async function sendGmail(to, subject, message) {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM } = env;
    requireValue(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_FROM,
      503, 'Falta configurar el envío de códigos con Gmail.');
    const mailbox = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
    requireValue(mailbox.test(to) && !/[\r\n]/.test(to), 400, 'El correo de la cuenta no es válido.');
    requireValue(mailbox.test(GMAIL_FROM) && !/[\r\n]/.test(GMAIL_FROM),
      503, 'El remitente de Gmail no está configurado correctamente.');
    const raw = [
      `From: AutoPremium <${GMAIL_FROM}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(message).toString('base64'),
    ].join('\r\n');
    try {
      const token = await fetcher('https://oauth2.googleapis.com/token', {
        method: 'POST', signal: AbortSignal.timeout(5000),
        body: new URLSearchParams({
          client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET,
          refresh_token: GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token',
        }),
      });
      if (!token.ok) throw new Error('gmail_oauth');
      const { access_token } = await token.json();
      if (typeof access_token !== 'string' || !access_token) throw new Error('gmail_oauth');
      const response = await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
      });
      if (!response.ok) throw new Error('gmail_send');
    } catch {
      throw Object.assign(new Error('Gmail no pudo enviar el código. Inténtalo de nuevo.'), { status: 503 });
    }
  }

  async function sendEmail(to, code, purpose) {
    const subject = purpose === 'verify_email' ? 'Verifica tu cuenta de AutoPremium' : 'Código de acceso a AutoPremium';
    const message = `Tu código de verificación es ${code}. Vence en 10 minutos. Si no solicitaste este código, ignora este mensaje.`;
    if (env.AUTH_EMAIL_PROVIDER === 'gmail') return sendGmail(to, subject, message);
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
          subject,
          text: message,
          html: `<p>Tu código de verificación es:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Vence en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>`,
        }),
      });
    } catch {
      throw Object.assign(new Error('No se pudo enviar el correo de verificación. Inténtalo de nuevo.'), { status: 503 });
    }
    if (!response.ok) throw Object.assign(new Error('El proveedor de correo no pudo enviar el código.'), { status: 503 });
  }

  return { sendEmail };
}

export async function createOtpChallenge({ pool, delivery, user, channel, purpose, secret, now = Date.now() }) {
  requireValue(channel === 'email' || (channel === 'totp' && purpose === 'login'),
    400, 'Selecciona un método de verificación válido.');
  requireValue(['verify_email', 'login'].includes(purpose), 400, 'No se pudo iniciar la verificación.');
  const id = randomUUID();
  const code = String(randomInt(100000, 1000000));
  await transaction(pool, async db => {
    await db.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [user.id]);
    if (channel === 'totp') {
      const factor = await db.query('SELECT 1 FROM auth_totp WHERE user_id=$1 AND enabled_at IS NOT NULL', [user.id]);
      requireValue(factor.rowCount, 409, 'Primero inicia sesión por correo y activa la app autenticadora en Mi cuenta.');
    }
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
    if (channel === 'email') await delivery.sendEmail(user.email, code, purpose);
  } catch (error) {
    await pool.query('UPDATE auth_challenges SET consumed_at=NOW() WHERE id=$1', [id]);
    throw error;
  }
  return {
    challengeId: id,
    method: channel,
    destination: channel === 'totp' ? null : maskEmail(user.email),
    expiresInSeconds: AUTH_OTP_TTL_MS / 1000,
  };
}
