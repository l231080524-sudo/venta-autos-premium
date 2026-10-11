import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.js';

test('webhook rechazado registra motivo sin exponer firma, secreto ni cuerpo', async t => {
  const logs = [];
  const previous = console.info;
  console.info = value => logs.push(JSON.parse(value));
  t.after(() => { console.info = previous; });
  const pool = { query: async () => { throw new Error('No consultar DB antes de autenticar'); } };
  const config = { webhookSecret: 'SECRETO_NO_REGISTRAR', origins: [] };
  const server = createApp({ pool, config, mp: {} }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/mercadopago/webhook`;
  const response = await fetch(base + '?data.id=ORDTEST', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'order', data: { id: 'ORDTEST', token: 'TOKEN_NO_REGISTRAR' } }),
  });
  assert.equal(response.status, 401);
  await response.text();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].validacion, 'x_signature_ausente');
  assert.equal(logs[0].http, 401);
  assert.equal(logs[0].ids_coinciden, true);
  assert.equal(JSON.stringify(logs).includes('NO_REGISTRAR'), false);
});
