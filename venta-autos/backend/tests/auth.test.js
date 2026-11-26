import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthDelivery, maskEmail, normalizePhone, otpDigest, otpMatches } from '../auth.js';

test('normaliza teléfonos mexicanos a formato internacional', () => {
  assert.equal(normalizePhone('55 3046 7391'), '+525530467391');
  assert.equal(normalizePhone('+52 55 3046 7391'), '+525530467391');
  assert.equal(normalizePhone('+1 (415) 555-2671'), '+14155552671');
  assert.throws(() => normalizePhone('123'));
  assert.equal(maskEmail('hugo@example.com'), 'h***@example.com');
});

test('los OTP se comparan como HMAC y no aceptan código distinto', () => {
  const id = '4f53207d-95d3-4796-a50b-e7b7d63a1e2c';
  const digest = otpDigest(id, '381042', 'clave-prueba-suficientemente-larga').toString('hex');
  assert.equal(otpMatches(id, '381042', digest, 'clave-prueba-suficientemente-larga'), true);
  assert.equal(otpMatches(id, '381043', digest, 'clave-prueba-suficientemente-larga'), false);
  assert.equal(otpMatches(id, '381042', digest, 'otra-clave'), false);
});

test('el proveedor de correo usa HTTPS y conserva el código solo en el contenido del mensaje', async () => {
  const requests = [];
  const delivery = createAuthDelivery({
    env: { RESEND_API_KEY: 'resend-test-key', AUTH_EMAIL_FROM: 'AutoPremium <login@example.test>' },
    fetcher: async (url, options) => { requests.push({ url, options }); return new Response('{}', { status: 200 }); },
  });
  await delivery.sendEmail('cliente@example.test', '672109', 'login');
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer resend-test-key');
  const body = JSON.parse(requests[0].options.body);
  assert.deepEqual(body.to, ['cliente@example.test']);
  assert.match(body.text, /672109/);
  assert.equal(body.html.includes('onerror='), false);
});

test('Gmail renueva la autorización y envía un OTP por HTTPS a otro dominio', async () => {
  const requests = [];
  const delivery = createAuthDelivery({
    env: {
      AUTH_EMAIL_PROVIDER: 'gmail', GMAIL_CLIENT_ID: 'demo-client', GMAIL_CLIENT_SECRET: 'demo-secret',
      GMAIL_REFRESH_TOKEN: 'demo-refresh', GMAIL_FROM: 'autopremium@example.test',
    },
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return Response.json(url.includes('oauth2') ? { access_token: 'demo-access' } : { id: 'message' });
    },
  });
  await delivery.sendEmail('usuario@otro-dominio.test', '123456', 'verify_email');
  assert.equal(requests[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(requests[0].options.body.get('grant_type'), 'refresh_token');
  assert.equal(requests[0].options.body.get('refresh_token'), 'demo-refresh');
  assert.equal(requests[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(requests[1].options.headers.Authorization, 'Bearer demo-access');
  const mime = Buffer.from(JSON.parse(requests[1].options.body).raw, 'base64url').toString();
  assert.match(mime, /To: usuario@otro-dominio\.test\r\n/);
  const body = Buffer.from(mime.split('\r\n\r\n')[1], 'base64').toString();
  assert.match(body, /123456/);
  await assert.rejects(delivery.sendEmail('usuario@example.test\r\nBcc: otro@example.test', '123456', 'login'), /no es válido/);
  assert.equal(requests.length, 2);
});
