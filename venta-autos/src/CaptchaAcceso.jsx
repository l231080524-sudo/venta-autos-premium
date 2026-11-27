import html from './CaptchaAcceso.html?raw';
import { crearVistas } from './plantillas';

const vista = crearVistas(html);
export function CaptchaAcceso({ estado, resolverCaptcha, ocupado }) {
  const texto = {
    listo: 'No soy un robot',
    verificando: 'Comprobando…',
    verificado: 'Verificación completada',
    error: 'Reintentar verificación',
  }[estado];

  return vista('captcha-de-acceso', { 'texto-captcha': texto }, {
    'resolver-captcha': {
      onClick: () => {
        if (!ocupado && estado !== 'verificando' && estado !== 'verificado') void resolverCaptcha().catch(() => {});
      },
      'aria-disabled': ocupado || estado === 'verificando' || estado === 'verificado',
      'aria-label': texto,
      'aria-pressed': estado === 'verificado',
    },
  });
}
