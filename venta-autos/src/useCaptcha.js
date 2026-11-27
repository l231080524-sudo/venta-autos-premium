import { useEffect, useState } from 'react';

export function useCaptcha(apiUrl, activo) {
  const [reto, setReto] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [version, pedirNuevo] = useState(0);

  useEffect(() => {
    if (!activo) return undefined;
    const controller = new AbortController();
    async function cargar() {
      try {
        const response = await fetch(apiUrl + '/api/auth/captcha/texto', {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('No se pudo cargar el CAPTCHA. Genera un código nuevo.');
        const nuevo = await response.json();
        if (typeof nuevo.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(nuevo.id)
          || typeof nuevo.imagen !== 'string' || !nuevo.imagen.startsWith('data:image/svg+xml;base64,')) {
          throw new Error('El CAPTCHA no se recibió correctamente. Genera un código nuevo.');
        }
        if (!controller.signal.aborted) {
          setReto({ ...nuevo, audio: apiUrl + '/api/auth/captcha/texto/' + nuevo.id + '/audio' });
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message || 'No se pudo cargar el CAPTCHA.');
      }
    }
    void cargar();
    return () => controller.abort();
  }, [apiUrl, activo, version]);

  function reiniciarCaptcha() {
    setReto(null);
    setRespuesta('');
    setError('');
    pedirNuevo(value => value + 1);
  }

  function resolverCaptcha() {
    if (!reto) throw new Error('Genera un código de verificación antes de continuar.');
    if (!/^\d{6}$/.test(respuesta)) throw new Error('Escribe los seis dígitos del CAPTCHA.');
    return { id: reto.id, respuesta };
  }

  return { reto, respuesta, setRespuesta, error, resolverCaptcha, reiniciarCaptcha };
}
