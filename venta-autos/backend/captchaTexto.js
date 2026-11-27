import { randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { requireValue } from './core.js';

const ancho = 236;
const alto = 64;
const frecuencia = 12_000;
const duracion = 3 * 60_000;
const capacidad = 2000;
const figuras = [
  ['01110','11011','11011','11011','11011','11011','01110'],
  ['01100','11100','01100','01100','01100','01100','11110'],
  ['01110','11011','00011','00110','01100','11000','11111'],
  ['11110','00011','00011','01110','00011','00011','11110'],
  ['00110','01110','11010','11010','11111','00010','00010'],
  ['11111','11000','11000','11110','00011','11011','01110'],
  ['01110','11000','11000','11110','11011','11011','01110'],
  ['11111','00011','00110','00110','01100','01100','01100'],
  ['01110','11011','11011','01110','11011','11011','01110'],
  ['01110','11011','11011','01111','00011','00011','01110'],
];
const trazos = figuras.map(filas => filas.map((fila, y) =>
  Array.from(fila, (pixel, x) => pixel === '1' ? 'M'+(4*x)+' '+(5*y)+'h4v5h-4z' : '').join('')
).join(''));
const clips = figuras.map((_, i) => readFileSync(new URL('./captcha-audio/'+i+'.pcm', import.meta.url)));

function dibujar(codigo) {
  const letras = Array.from(codigo, (digito, i) => {
    const x = 14 + i * 36 + randomInt(-2, 3);
    const y = 15 + randomInt(-4, 5);
    const angulo = randomInt(-11, 12);
    return '<path fill="#203045" transform="translate('+x+' '+y+') rotate('+angulo+' 10 15)" d="'+trazos[digito]+'"/>';
  }).join('');
  const puntos = Array.from({length:68}, () =>
    '<circle cx="'+randomInt(ancho)+'" cy="'+randomInt(alto)+'" r="'+randomInt(1,3)+'" fill="#67869d" opacity=".24"/>'
  ).join('');
  const curvas = Array.from({length:4}, () => {
    const y = randomInt(10, 54);
    return '<path d="M0 '+y+' Q '+randomInt(24, 110)+' '+randomInt(alto)+' '+ancho+' '+randomInt(alto)+'" fill="none" stroke="#70899e" opacity=".36"/>';
  }).join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+ancho+'" height="'+alto+'"><rect width="100%" height="100%" fill="#f6f9fc"/>'+puntos+letras+curvas+'</svg>';
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function sonido(codigo) {
  const partes = Array.from(codigo, digito => {
    const clip = clips[digito];
    const wav = Buffer.alloc(clip.length + randomInt(1800, 3400) * 2);
    const ganancia = randomInt(79, 100) / 100;
    const ruido = randomBytes(clip.length / 2);
    for (let i = 0; i < clip.length; i += 2) {
      wav.writeInt16LE(Math.round(clip.readInt16LE(i) * ganancia + ruido[i / 2] - 128), i);
    }
    return wav;
  });
  const datos = Buffer.concat(partes);
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF');
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVEfmt ', 8);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);
  cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(frecuencia, 24);
  cabecera.writeUInt32LE(frecuencia * 2, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

export function crearCaptchaTexto({
  ahora = Date.now, generarCodigo = () => String(randomInt(1_000_000)).padStart(6, '0'),
} = {}) {
  const retos = new Map();

  function emitir() {
    const fecha = ahora();
    for (const [id, reto] of retos) {
      if (reto.vence <= fecha) retos.delete(id);
    }
    requireValue(retos.size < capacidad, 503, 'Hay muchas verificaciones activas. Intenta de nuevo en unos minutos.');
    const id = randomUUID();
    const codigo = generarCodigo();
    retos.set(id, { codigo, vence: fecha + duracion });
    return { id, imagen: dibujar(codigo) };
  }

  function audio(id) {
    const reto = retos.get(id);
    requireValue(reto && reto.vence > ahora(), 404, 'El código expiró. Genera uno nuevo.');
    return sonido(reto.codigo);
  }

  function validar(captcha) {
    requireValue(typeof captcha?.id === 'string' && typeof captcha.respuesta === 'string'
      && /^\d{6}$/.test(captcha.respuesta), 400, 'Escribe los seis dígitos del CAPTCHA.');
    const reto = retos.get(captcha.id);
    retos.delete(captcha.id);
    requireValue(reto && reto.vence > ahora()
      && timingSafeEqual(Buffer.from(reto.codigo), Buffer.from(captcha.respuesta)),
    400, 'El código del CAPTCHA es incorrecto o expiró. Intenta con el nuevo código.');
  }

  return { emitir, audio, validar };
}
