import { randomBytes, randomInt, randomUUID, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { requireValue } from './core.js';

const duracion = 3 * 60_000;
const capacidad = 2000;
const rondas = 400;
const maximo = 1000;

function calcular(semilla, numero) {
  return pbkdf2Sync(semilla, String(numero), rondas, 16, 'sha256');
}

export function crearCaptcha(ahora = Date.now) {
  const retos = new Map();

  function emitir() {
    const fecha = ahora();
    for (const [id, reto] of retos) {
      if (reto.vence <= fecha) retos.delete(id);
    }
    requireValue(retos.size < capacidad, 503, 'Hay muchas verificaciones activas. Intenta de nuevo en unos minutos.');
    const id = randomUUID();
    const semilla = randomBytes(24).toString('hex');
    const huella = calcular(semilla, randomInt(0, maximo));
    retos.set(id, { semilla, huella, vence: fecha + duracion });
    return { id, semilla, huella: huella.toString('hex') };
  }

  function validar(respuesta) {
    requireValue(typeof respuesta?.id === 'string' && Number.isInteger(respuesta.numero)
      && respuesta.numero >= 0 && respuesta.numero < maximo, 400, 'Completa la verificación «No soy un robot».');
    const reto = retos.get(respuesta.id);
    retos.delete(respuesta.id);
    requireValue(reto && reto.vence > ahora()
      && timingSafeEqual(calcular(reto.semilla, respuesta.numero), reto.huella),
    400, 'La verificación no es válida o expiró. Inténtala de nuevo.');
  }

  return { emitir, validar };
}
