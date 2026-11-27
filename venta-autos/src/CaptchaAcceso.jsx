import html from './CaptchaAcceso.html?raw';
import { crearVistas } from './plantillas';

const vista = crearVistas(html);

export function CaptchaAcceso({ reto, respuesta, setRespuesta, error, reiniciarCaptcha, ocupado }) {
  return vista('captcha-de-acceso', {
    'reto-captcha': reto ? vista('reto-captcha', {}, {
      'imagen-captcha': { src: reto.imagen },
      'audio-captcha': { src: reto.audio, key: reto.id },
      'codigo-captcha': {
        value: respuesta,
        disabled: ocupado,
        onChange: event => setRespuesta(event.target.value.replace(/\D/g, '').slice(0, 6)),
      },
    }) : vista('estado-captcha', { 'mensaje-captcha': error || 'Cargando código de seguridad…' }),
  }, {
    'nuevo-captcha': { disabled: ocupado, onClick: reiniciarCaptcha },
  });
}
