import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cents, money, sessionToken, sessionUser, hashPassword, verifyPassword, sealRequest, unsealRequest, validWebhook, webhookValidation, validateRemote, paymentState, transaction, buyerIdentification } from '../core.js';
import { createMercadoPago, readConfig, assertCheckoutConfig } from '../config.js';
const secret = 'solo-pruebas-'.repeat(4);

test('documento opcional del Brick: ausente, vacío, completo y malformado',()=> {
  for(const input of [undefined,null,{}, {type:'',number:''}, {type:null,number:null}]) assert.equal(buyerIdentification(input),undefined);
  assert.deepEqual(buyerIdentification({type:'CURP',number:'TEST123',extra:'no reenviar'}),{type:'CURP',number:'TEST123'});
  for(const input of [[], 'texto', {type:'CURP'}, {number:'TEST123'}, {type:'CURP',number:123}, {type:'CURP',number:'<script>'}])
    assert.throws(()=>buyerIdentification(input),error=>error.status===400);
});

test('dinero exacto y formatos inválidos', () => {
  assert.equal(money(cents('1.00') * 3), '3.00');
  for (const value of ['1.001', '-1', 'NaN', '1e2', '']) assert.throws(() => cents(value));
});
test('sesión firmada: manipulación, caducidad y secreto incorrecto', () => {
  const token = sessionToken(23, secret, 1000);
  assert.equal(sessionUser(token, secret, 2000), 23);
  assert.equal(sessionUser(token, secret, 9 * 3600000), null);
  assert.equal(sessionUser(token + 'x', secret, 2000), null);
  assert.equal(sessionUser(token, 'otro', 2000), null);
});
test('contraseñas heredadas y hash de contraseñas nuevas', async () => {
  const hash = await hashPassword('prueba-secret');
  assert.equal(await verifyPassword('prueba-secret', hash), true);
  assert.equal(await verifyPassword('otra', hash), false);
  assert.equal(await verifyPassword('legacy', 'legacy'), true);
  assert.equal(await verifyPassword('otra', 'legacy'), false);
});
test('payload recuperable cifrado, sin exponer el token y resistente a manipulación', () => {
  const request = { transactions: { token: 'TOKEN_SOLO_PRUEBA' } };
  const sealed = sealRequest(request, secret);
  assert.equal(JSON.stringify(sealed).includes('TOKEN_SOLO_PRUEBA'), false);
  assert.deepEqual(unsealRequest(sealed, secret), request);
  assert.throws(() => unsealRequest(sealed, 'otra-clave'));
  assert.throws(() => unsealRequest({ ...sealed, tag: Buffer.alloc(16).toString('base64') }, secret));
});
test('webhook firmado: URL en minúsculas e ID/cabeceras adulterados', () => {
  const dataId = 'ORDTest', requestId = 'req-1', ts = '100';
  const v1 = createHmac('sha256', secret).update(`id:ordtest;request-id:${requestId};ts:${ts};`).digest('hex');
  const args = { dataId, requestId, signature: `ts=${ts},v1=${v1}`, secret };
  assert.equal(validWebhook(args), true);
  assert.equal(validWebhook({ ...args, dataId: 'ORDOtra' }), false);
  assert.equal(validWebhook({ ...args, signature: 'ts=1,v1=hola' }), false);
});

test('Orders: firma oficial conserva el ID en mayúsculas y rechaza alteraciones', () => {
  const dataId = 'ORDTST01M4MW4DTZBKE9QA19DGB5TV7H';
  const requestId = 'request-orders', ts = '1742505638683';
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  const args = { secret, dataId, requestId, signature: `ts=${ts},v1=${v1}` };
  assert.equal(validWebhook(args), true);
  assert.equal(validWebhook({ ...args, dataId: dataId + 'X' }), false);
  assert.equal(validWebhook({ ...args, requestId: 'otro' }), false);
  assert.equal(validWebhook({ ...args, secret: 'otro' }), false);
  assert.equal(validWebhook({ ...args, signature: `ts=${Number(ts) + 1},v1=${v1}` }), false);
});

test('diagnóstico de firma: campos ausentes, espacios y componentes duplicados', () => {
  const ts = '100', requestId = 'req-1', dataId = 'ORDTEST';
  const v1 = createHmac('sha256', secret).update(`id:ordtest;request-id:${requestId};ts:${ts};`).digest('hex');
  const args = { secret, requestId, dataId, signature: `ts=${ts},v1=${v1}` };
  assert.deepEqual(webhookValidation(args), { valid: true, reason: 'firma_valida' });
  assert.equal(validWebhook({ ...args, signature: `ts = ${ts}, v1 = ${v1}` }), true);
  for (const [change, reason] of [
    [{ secret: '' }, 'secreto_ausente'],
    [{ dataId: undefined }, 'data_id_url_ausente'],
    [{ signature: undefined }, 'x_signature_ausente'],
    [{ requestId: undefined }, 'x_request_id_ausente'],
    [{ signature: `${args.signature},ts=100` }, 'x_signature_formato_invalido'],
    [{ signature: 'ts=100,v1=mal' }, 'x_signature_formato_invalido'],
    [{ requestId: 'otro' }, 'firma_no_coincide'],
  ]) assert.deepEqual(webhookValidation({ ...args, ...change }), { valid: false, reason });
});
test('solo processed/accredited confirma; referencias, país, montos y cuenta deben coincidir', () => {
  const order = { referencia: 'ref', moneda: 'MXN', importe_a_cobrar: '1.00' };
  const payment = { mp_order_id: 'ORD123', importe: '1.00', ambiente: 'prueba' };
  const config = { sellerId: '5', applicationId: '9' };
  const remote = { id: 'ORD123', external_reference: 'ref', country_code: 'MEX', total_amount: '1.00', total_paid_amount: '1.00', user_id: '5', integration_data: { application_id: '9' }, status: 'processed', status_detail: 'accredited' };
  assert.doesNotThrow(() => validateRemote(remote, order, payment, config));
  for (const change of [{ total_amount: '2.00' }, { total_paid_amount: '0.99' }, { external_reference: 'otro' }, { user_id: '7' }, { country_code: 'BRA' }, { live_mode: true }, { currency: 'USD' }, { integration_data: {} }])
    assert.throws(() => validateRemote({ ...remote, ...change }, order, payment, config));
  assert.equal(paymentState({ status: 'approved' }), 'en_proceso');
  assert.equal(paymentState({ status: 'processed', status_detail: 'refunded' }), 'reembolsado');
});
test('una conexión por transacción, rollback y release tras fallo', async () => {
  const calls = [];
  const pool = { connect: async () => ({ query: async sql => calls.push(sql), release: () => calls.push('release') }) };
  await assert.rejects(transaction(pool, async db => { await db.query('mutacion'); throw new Error('fallo'); }));
  assert.deepEqual(calls, ['BEGIN', 'mutacion', 'ROLLBACK', 'release']);
});
test('transporte Orders acepta 402 con order y repite la misma clave', async () => {
  const calls = [];
  const mp = createMercadoPago({ accessToken: 'prueba' }, async (url, options) => {
    calls.push({ url, options });
    return { status: 402, ok: false, json: async () => ({ id: 'ORD123', status: 'failed' }) };
  });
  assert.equal((await mp.create({ total_amount: '1.00' }, 'clave')).id, 'ORD123');
  assert.equal(calls[0].options.headers['X-Idempotency-Key'], 'clave');
});

test('rechazo 402 envuelto en data conserva el ID para consultar y cancelar',async()=> {
  const remote={id:'ORDNESTED',status:'failed',status_detail:'failed'};
  const mp=createMercadoPago({accessToken:'prueba'},async()=>({status:402,ok:false,json:async()=>({errors:[{code:'failed'}],data:remote})}));
  assert.deepEqual(await mp.create({},'misma-clave'),remote);
  const malformed=createMercadoPago({accessToken:'prueba'},async()=>({status:402,ok:false,json:async()=>({errors:[{code:'failed'}]})}));
  await assert.rejects(malformed.create({},'misma-clave'));
});
test('cuenta real o país incorrecto no recibe ninguna creación de pago', async () => {
  const mp = createMercadoPago({ accessToken: 'prueba', sellerId: '5' }, async () => ({ ok: true, status: 200, json: async () => ({ id: 5, site_id: 'MLM', tags: [] }) }));
  await assert.rejects(mp.assertSeller());
  assert.throws(() => assertCheckoutConfig(readConfig({ MP_ENABLED: 'true', MP_ENV: 'produccion' })));
});

test('producción exige claves, vendedor real mexicano y rechaza órdenes Sandbox', async () => {
  const config=readConfig({MP_ENABLED:'true',MP_ENV:'produccion',MP_ACCESS_TOKEN:'APP_USR-test',MP_PUBLIC_KEY:'APP_USR-public',MP_WEBHOOK_SECRET:'secret',MP_SELLER_ID:'5',MP_APPLICATION_ID:'9',AUTH_SECRET:secret});
  assert.doesNotThrow(()=>assertCheckoutConfig(config));
  for(const change of [{publicKey:''},{webhookSecret:''},{accessToken:'TEST-token'},{environment:'otro'}]) assert.throws(()=>assertCheckoutConfig({...config,...change}));
  for(const account of [{id:5,site_id:'MLM',tags:['test_user']},{id:6,site_id:'MLM',tags:[]},{id:5,site_id:'MLA',tags:[]}]) {
    const mp=createMercadoPago(config,async()=>({ok:true,json:async()=>account}));
    await assert.rejects(mp.assertSeller());
  }
  const mp=createMercadoPago(config,async()=>({ok:true,json:async()=>({id:5,site_id:'MLM',tags:[]})}));
  await assert.doesNotReject(mp.assertSeller());
  const order={referencia:'ref',moneda:'MXN',importe_a_cobrar:'180.00'};
  const payment={mp_order_id:'ORD123',ambiente:'produccion',importe:'180.00'};
  const remote={id:'ORD123',external_reference:'ref',country_code:'MEX',total_amount:'180.00',total_paid_amount:'180.00',user_id:5,integration_data:{application_id:9},status:'processed',status_detail:'accredited'};
  assert.doesNotThrow(()=>validateRemote(remote,order,payment,config));
  assert.throws(()=>validateRemote({...remote,live_mode:false},order,payment,config));
  assert.throws(()=>validateRemote({...remote,id:'ORDTST123'},order,{...payment,mp_order_id:'ORDTST123'},config));
});
