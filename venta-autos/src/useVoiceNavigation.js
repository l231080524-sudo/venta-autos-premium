import { useEffect, useRef, useState } from 'react';

const phrases = {
  home: ['inicio', 'ir a inicio', 'ir al inicio', 'pagina principal', 'volver al inicio'],
  catalog: ['catalogo', 'ir al catalogo', 'ver catalogo'],
  cart: ['carrito', 'ir al carrito', 'ver carrito'],
  account: ['iniciar sesion', 'abrir sesion', 'mi cuenta', 'cuenta'],
  up: ['subir', 'arriba', 'subir pagina'], down: ['bajar', 'abajo', 'bajar pagina'],
  top: ['volver arriba', 'ir arriba', 'volver al principio', 'principio de la pagina'],
  controls: ['controles', 'volver a controles', 'mostrar controles'],
  details: ['mas informacion', 'ver detalles', 'ficha tecnica'],
  close: ['cerrar', 'cerrar ventana', 'cerrar panel'], stop: ['detener', 'parar', 'detener voz', 'desactivar voz'],
};

export function parseVoiceCommand(text) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ').replace(/^por favor /, '').replace(/ por favor$/, '');
  return Object.keys(phrases).find(command => phrases[command].includes(normalized)) || null;
}

export default function useVoiceNavigation(onCommand) {
  const supported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('Micrófono apagado.');
  const recognition = useRef(null);
  const commandRef = useRef(onCommand);
  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);

  function stop() {
    const current = recognition.current;
    recognition.current = null;
    current?.abort();
    setActive(false);
    setStatus('Micrófono apagado.');
  }

  function start() {
    if (!supported || recognition.current) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const current = new Recognition();
    recognition.current = current;
    current.lang = 'es-MX';
    current.continuous = true;
    current.interimResults = false;
    current.maxAlternatives = 1;
    let processed = 0;
    setActive(true);
    setStatus('Solicitando acceso al micrófono…');
    current.onstart = () => { if (recognition.current === current) setStatus('Escuchando. Di «catálogo», «bajar» o «volver arriba».'); };
    current.onresult = event => {
      if (recognition.current !== current) return;
      for (let i = Math.max(event.resultIndex, processed); i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        processed = i + 1;
        const command = parseVoiceCommand(event.results[i][0].transcript);
        if (command === 'stop') { stop(); return; }
        setStatus(command ? commandRef.current(command) : 'Comando no reconocido. Di «inicio», «catálogo», «carrito», «subir», «bajar» o «cerrar».');
      }
    };
    current.onerror = event => {
      if (recognition.current !== current) return;
      recognition.current = null;
      setActive(false);
      const messages = {
        'not-allowed': 'Permite el micrófono en el navegador y vuelve a activar la voz.',
        'service-not-allowed': 'El navegador no permite el reconocimiento de voz. Usa los controles de teclado.',
        'audio-capture': 'No se detectó un micrófono disponible.',
        'network': 'No se pudo conectar al servicio de voz. Revisa tu conexión.',
        'no-speech': 'No se detectó voz. Pulsa Activar voz para intentarlo otra vez.',
      };
      setStatus(messages[event.error] || 'La escucha se interrumpió. Puedes volver a activar la voz.');
      current.abort();
    };
    current.onend = () => {
      if (recognition.current !== current) return;
      recognition.current = null;
      setActive(false);
      setStatus('La escucha terminó. Pulsa Activar voz para continuar.');
    };
    try { current.start(); }
    catch { recognition.current = null; setActive(false); setStatus('No se pudo activar el micrófono. Comprueba los permisos del navegador.'); }
  }

  useEffect(() => {
    function pause() {
      if (document.hidden && recognition.current) {
        const current = recognition.current;
        recognition.current = null;
        current.abort();
        setActive(false);
        setStatus('Micrófono apagado al cambiar de pestaña.');
      }
    }
    document.addEventListener('visibilitychange', pause);
    return () => {
      document.removeEventListener('visibilitychange', pause);
      const current = recognition.current;
      recognition.current = null;
      current?.abort();
    };
  }, []);
  return { supported, active, status, start, stop };
}
