import { cents, requireValue } from './core.js';

export function readConfig(env = process.env) {
  return {
    // Credenciales privadas: se leen de .env en local o de Environment en Render.
    // NUNCA poner el Access Token en una variable VITE_ ni en el código React.
    accessToken: env.MP_ACCESS_TOKEN || '',
    webhookSecret: env.MP_WEBHOOK_SECRET || '',
    sellerId: env.MP_SELLER_ID || '',
    applicationId: env.MP_APPLICATION_ID || '',
    // Orders exige este correo para tarjetas de prueba; no es el correo personal de la cuenta.
    buyerEmail: env.MP_TEST_BUYER_EMAIL || 'test@testuser.com',
    environment: env.MP_ENV || 'prueba',
    enabled: env.MP_ENABLED === 'true',
    // El precio de prueba no modifica el precio comercial del catálogo.
    testUnitPrice: env.MP_TEST_UNIT_PRICE || '10.00',
    authSecret: env.AUTH_SECRET || '',
    origins: (env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map(x => x.trim()),
  };
}

export function assertCheckoutConfig(config) {
  requireValue(config.enabled, 503, 'Los pagos aún no están habilitados.');
  // Esta entrega habilita únicamente Sandbox. Producción necesita revisión final y precios reales.
  requireValue(config.environment === 'prueba', 503, 'Esta integración está habilitada solo para pruebas.');
  requireValue(config.accessToken && config.sellerId && config.applicationId && config.buyerEmail,
    503, 'Falta configurar Mercado Pago en el servidor.');
  requireValue(config.buyerEmail === 'test@testuser.com', 503, 'Para tarjetas de prueba de Orders usa test@testuser.com.');
  requireValue(cents(config.testUnitPrice) > 0, 503, 'Falta un importe de prueba válido.');
  requireValue(config.authSecret.length >= 32, 503, 'Configura AUTH_SECRET para proteger los intentos de pago.');
}

export function createMercadoPago(config, fetcher = fetch) {
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetcher(`https://api.mercadopago.com${path}`, {
        ...options, signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json', ...options.headers },
      });
    } catch {
      // Un timeout NO prueba que Mercado Pago haya rechazado la creación.
      // El siguiente intento reutiliza la clave y el cuerpo ya guardados en PostgreSQL.
      throw Object.assign(new Error('Mercado Pago no respondió. Reintenta la misma orden desde tu historial.'), { status: 502 });
    }
    const data = await response.json();
    // Orders puede devolver 402 con una order creada pero una tarjeta rechazada.
    // Orders devuelve rechazos tanto directamente como en { errors, data: order }.
    // Conservar el ID permite consultar el resultado y cancelar sin dejar el intento bloqueado.
    if (response.status === 402 && (data.data?.id || data.id)) return data.data?.id ? data.data : data;
    if (!response.ok) {
      // No devolvemos ni registramos el cuerpo completo: puede contener datos personales.
      throw Object.assign(new Error(`Mercado Pago no pudo completar la operación (HTTP ${response.status}). Revisa las credenciales y el importe permitido.`), { status: 502,
        definitive: [400,401,403,422].includes(response.status) });
    }
    return data;
  }
  return {
    create: (body, key) => request('/v1/orders', { method: 'POST', headers: { 'X-Idempotency-Key': key }, body: JSON.stringify(body) }),
    get: id => request(`/v1/orders/${encodeURIComponent(id)}`),
    assertTestSeller: async () => {
      // Verifica ANTES de enviar la tarjeta que el token pertenece al vendedor de prueba mexicano.
      const account = await request('/users/me');
      requireValue(String(account.id) === config.sellerId && account.site_id === 'MLM'
        && (config.accessToken.startsWith('TEST-') || account.tags?.includes('test_user')), 503, 'Usa las credenciales de PRUEBA de México.');
    },
  };
}
