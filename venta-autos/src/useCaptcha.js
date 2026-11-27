import { useRef, useState } from 'react';

const codificador = new TextEncoder();

async function resolver(apiUrl) {
  const response = await fetch(apiUrl + '/api/auth/captcha', { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo iniciar la verificación. Inténtalo de nuevo.');
  const { id, semilla, huella } = await response.json();
  if (typeof id !== 'string' || !/^[a-f0-9]{48}$/.test(semilla) || !/^[a-f0-9]{32}$/.test(huella)) {
    throw new Error('No se recibió una verificación válida.');
  }
  const llave = await window.crypto.subtle.importKey('raw', codificador.encode(semilla), 'PBKDF2', false, ['deriveBits']);
  for (let numero = 0; numero < 1000; numero++) {
    const resultado = await window.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 400,
      salt: codificador.encode(String(numero)),
    }, llave, 128);
    const hex = Array.from(new Uint8Array(resultado), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hex === huella) return { id, numero };
  }
  throw new Error('No se pudo completar la verificación. Inténtalo de nuevo.');
}

export function useCaptcha(apiUrl) {
  const [estado, setEstado] = useState('listo');
  const pendiente = useRef(null);

  function resolverCaptcha() {
    if (!pendiente.current) {
      setEstado('verificando');
      pendiente.current = resolver(apiUrl).then(respuesta => {
        setEstado('verificado');
        return respuesta;
      }).catch(error => {
        pendiente.current = null;
        setEstado('error');
        throw error;
      });
    }
    return pendiente.current;
  }

  function reiniciarCaptcha() {
    pendiente.current = null;
    setEstado('listo');
  }

  return { estado, resolverCaptcha, reiniciarCaptcha };
}
