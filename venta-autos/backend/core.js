import { createHmac, createHash, createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const requireValue = (condition, status, message) => {
  if (!condition) throw new HttpError(status, message);
};

// El Brick mexicano puede omitir identification o enviar ambos campos vacíos.
// No inventar un CURP: incluir el documento solo cuando se haya proporcionado completo.
export function buyerIdentification(value) {
  if (value == null) return undefined;
  requireValue(typeof value === 'object' && !Array.isArray(value), 400, 'Documento del comprador inválido.');
  const { type, number } = value;
  const empty = field => field == null || field === '';
  if (empty(type) && empty(number)) return undefined;
  requireValue(typeof type === 'string' && /^[a-zA-Z0-9_-]{1,20}$/.test(type)
    && typeof number === 'string' && /^[a-zA-Z0-9-]{1,30}$/.test(number), 400, 'Documento del comprador inválido.');
  return { type, number };
}

// Dinero en centavos: evita redondeos de punto flotante al sumar importes.
export function cents(value) {
  const text = String(value);
  requireValue(/^\d+(\.\d{1,2})?$/.test(text), 400, 'Importe inválido.');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  requireValue(Number.isSafeInteger(result), 400, 'Importe fuera de rango.');
  return result;
}
export const money = value => (value / 100).toFixed(2);

// Token temporal cifrado para repetir EXACTAMENTE una solicitud tras perder la respuesta.
// AUTH_SECRET debe conservarse entre reinicios. El payload se elimina al obtener el ID de MP.
export function sealRequest(body, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(body)), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
export function unsealRequest(body, secret) {
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), Buffer.from(body.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(body.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body.data, 'base64')), decipher.final()]).toString());
}

export async function transaction(pool, fn) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const result = await fn(db);
    await db.query('COMMIT');
    return result;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (!stored.startsWith('scrypt:')) {
    // Compatibilidad temporal con usuarios antiguos: se migra su contraseña al iniciar sesión.
    const a = Buffer.from(password), b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64), expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sessionToken(userId, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: now + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function sessionUser(token, secret, now = Date.now()) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return Number.isSafeInteger(data.sub) && data.exp > now ? data.sub : null;
  } catch { return null; }
}

export function webhookValidation({ signature, requestId, dataId, secret }) {
  // Solo devuelve motivos de diagnóstico. Nunca devuelve la clave, la firma ni los headers.
  if (!secret) return { valid: false, reason: 'secreto_ausente' };
  if (typeof dataId !== 'string' || !dataId) return { valid: false, reason: 'data_id_url_ausente' };
  if (typeof signature !== 'string' || !signature) return { valid: false, reason: 'x_signature_ausente' };
  if (typeof requestId !== 'string' || !requestId) return { valid: false, reason: 'x_request_id_ausente' };
  const pairs = signature.split(',').map(part => part.trim().split('=').map(value => value.trim()));
  if (pairs.some(pair => pair.length !== 2) || new Set(pairs.map(pair => pair[0])).size !== pairs.length)
    return { valid: false, reason: 'x_signature_formato_invalido' };
  const fields = Object.fromEntries(pairs);
  if (!/^\d+$/.test(fields.ts || '') || !/^[a-f0-9]{64}$/i.test(fields.v1 || ''))
    return { valid: false, reason: 'x_signature_formato_invalido' };
  // El SDK oficial actual conserva las mayúsculas del data.id de la URL.
  // También verificamos la forma en minúsculas usada por integraciones anteriores.
  // Ambas formas EXIGEN un HMAC válido con la clave privada; nunca aceptar solo el cuerpo.
  const ids = [...new Set([dataId.trim(), dataId.trim().toLowerCase()])];
  const received = Buffer.from(fields.v1, 'hex');
  const valid = ids.some(id => {
    const manifest = `id:${id};request-id:${requestId.trim()};ts:${fields.ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest();
    return timingSafeEqual(expected, received);
  });
  return { valid, reason: valid ? 'firma_valida' : 'firma_no_coincide' };
}

export function validWebhook(args) {
  return webhookValidation(args).valid;
}

export function paymentState(remote) {
  if (remote.status_detail === 'refunded' || remote.status === 'refunded') return 'reembolsado';
  if (remote.status_detail === 'partially_refunded') return 'reembolso_parcial';
  if (remote.status === 'processed' && remote.status_detail === 'accredited') return 'confirmado';
  if (remote.status === 'failed') return 'rechazado';
  if (remote.status === 'canceled') return 'cancelado';
  if (remote.status === 'created') return 'pendiente';
  return 'en_proceso';
}

export function validateRemote(remote, order, payment, config) {
  requireValue(remote.id === payment.mp_order_id && remote.external_reference === order.referencia,
    502, 'La referencia de Mercado Pago no coincide.');
  // Orders expresa el país; no todas sus respuestas incluyen currency.
  requireValue(remote.country_code === 'MEX' && (!remote.currency || remote.currency === order.moneda) && cents(remote.total_amount) === cents(order.importe_a_cobrar),
    502, 'El importe o moneda de Mercado Pago no coincide.');
  requireValue(String(remote.user_id) === config.sellerId, 502, 'El vendedor de Mercado Pago no coincide.');
  requireValue(String(remote.integration_data?.application_id) === config.applicationId, 502, 'La aplicación de Mercado Pago no coincide.');
  if (payment.ambiente === 'prueba') requireValue(remote.live_mode !== true,
    502, 'Se esperaba una orden de prueba. Revisa las credenciales.');
  // Orders puede omitir live_mode en GET: el vendedor se comprueba también con /users/me.
  if (payment.ambiente === 'produccion') requireValue(remote.live_mode !== false && !/^ORDTST/i.test(remote.id),
    502, 'Una orden Sandbox no puede confirmar un cobro real.');
  if (paymentState(remote) === 'confirmado') requireValue(cents(remote.total_paid_amount) === cents(payment.importe),
    502, 'El importe acreditado no coincide.');
}
