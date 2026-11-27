import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearCaptchaTexto } from '../captchaTexto.js';

test('emite una imagen sin el texto de la respuesta y la reproduce como WAV', () => {
  const captcha = crearCaptchaTexto({ generarCodigo: () => '026483' });
  const reto = captcha.emitir();
  assert.deepEqual(Object.keys(reto).sort(), ['id', 'imagen']);
  const imagen = Buffer.from(reto.imagen.split(',')[1], 'base64').toString();
  assert.match(imagen, /^<svg/);
  assert.doesNotMatch(imagen, /<text|026483/);
  const audio = captcha.audio(reto.id);
  assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
  assert.equal(audio.toString('ascii', 8, 12), 'WAVE');
  assert.equal(audio.readUInt32LE(40), audio.length - 44);
  assert.ok(audio.length > 44);
});

test('acepta ceros iniciales, consume el reto y rechaza códigos incorrectos o vencidos', () => {
  let fecha = 0;
  const captcha = crearCaptchaTexto({ ahora: () => fecha, generarCodigo: () => '026483' });
  const { id } = captcha.emitir();
  captcha.validar({ id, respuesta: '026483' });
  assert.throws(() => captcha.validar({ id, respuesta: '026483' }), { status: 400 });
  const segundo = captcha.emitir();
  assert.throws(() => captcha.validar({ id: segundo.id, respuesta: '000000' }), { status: 400 });
  assert.throws(() => captcha.validar({ id: segundo.id, respuesta: '026483' }), { status: 400 });
  const vencido = captcha.emitir();
  fecha = 180_000;
  assert.throws(() => captcha.audio(vencido.id), { status: 404 });
  assert.throws(() => captcha.validar({ id: vencido.id, respuesta: '026483' }), { status: 400 });
});
