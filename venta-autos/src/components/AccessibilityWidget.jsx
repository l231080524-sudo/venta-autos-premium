import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AccessibleDialog from './AccessibleDialog';
import AccessibilitySettings from './AccessibilitySettings';
import useVoiceNavigation from '../useVoiceNavigation';
import { focusNavigation, isEditing, returnToTop, scrollPage, showVehicleDetails } from '../navigationActions';

export default function AccessibilityWidget({ onAccount, ...settings }) {
  const [open, setOpen] = useState(false);
  const launcher = useRef(null);
  const navigate = useNavigate();
  const { keyboard, setKeyboard } = settings;
  const execute = useCallback(command => {
    const dialog = document.querySelector('dialog[open]');
    if (command === 'close') {
      dialog?.querySelector('.dialog-heading button')?.click();
      return dialog ? 'Ventana cerrada.' : 'No hay una ventana abierta.';
    }
    if (command === 'up' || command === 'down') { scrollPage(command === 'up' ? -1 : 1); return command === 'up' ? 'Subiendo.' : 'Bajando.'; }
    if (command === 'top') { returnToTop(); return 'De vuelta al principio.'; }
    if (dialog && dialog.getAttribute('aria-label') !== 'Accesibilidad') return 'Cierra la ventana antes de cambiar de apartado. Puedes decir «cerrar».';
    const routes = { home: '/', catalog: '/catalogo', cart: '/carrito' };
    if (routes[command]) { setOpen(false); navigate(routes[command]); return `Abriendo ${command === 'home' ? 'inicio' : command === 'catalog' ? 'catálogo' : 'carrito'}.`; }
    if (command === 'account') { setOpen(false); onAccount(); return 'Abriendo la cuenta.'; }
    if (command === 'controls') { setOpen(false); setKeyboard(true); requestAnimationFrame(focusNavigation); return 'Controles de teclado disponibles.'; }
    if (command === 'details') {
      if (!document.querySelector('.car-details-button')) return 'Abre el catálogo para consultar las fichas de los vehículos.';
      setOpen(false);
      requestAnimationFrame(showVehicleDetails);
      return 'Abriendo la ficha del vehículo.';
    }
    return 'Comando no disponible.';
  }, [navigate, onAccount, setKeyboard]);
  const voice = useVoiceNavigation(execute);

  useEffect(() => {
    function shortcuts(event) {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Home' && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        if (isEditing(event.target)) return;
        event.preventDefault(); returnToTop();
      }
      if (event.code !== 'F6' || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const dialog = document.querySelector('dialog[open]');
      if (dialog && dialog.getAttribute('aria-label') !== 'Accesibilidad') return;
      event.preventDefault();
      if (dialog) { setOpen(false); requestAnimationFrame(focusNavigation); }
      else focusNavigation();
    }
    document.addEventListener('keydown', shortcuts);
    return () => document.removeEventListener('keydown', shortcuts);
  }, []);

  return createPortal(<>
    <aside className="accessibility-widget print:hidden" aria-label="Acceso a accesibilidad">
      {(voice.active || voice.status !== 'Micrófono apagado.') && <div className="voice-indicator"><p role="status">{voice.status}</p><button type="button" onClick={voice.active ? voice.stop : voice.start}>{voice.active ? 'Detener voz' : 'Reactivar voz'}</button></div>}
      {keyboard && <button type="button" className="accessibility-back-top" aria-label="Volver arriba" title="Volver arriba (Ctrl + Inicio)" aria-keyshortcuts="Control+Home" onClick={returnToTop}>↑</button>}
      <button id="accessibility-launcher" ref={launcher} type="button" className="accessibility-launcher" aria-label="Accesibilidad" title="Accesibilidad" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="24" cy="24" r="19" /><circle cx="24" cy="13" r="2" fill="currentColor" stroke="none" /><path d="M13 20q11 4 22 0M24 19v10m0-1-6 12m6-12 6 12" strokeLinecap="round" /></svg>
      </button>
    </aside>
    {open && <AccessibleDialog title="Accesibilidad" onClose={() => setOpen(false)}>
      <div className="accessibility-panel-content">
        <AccessibilitySettings {...settings} onReset={voice.stop} />
        <section className="voice-settings" aria-labelledby="voice-title">
          <h3 id="voice-title">Navegación por voz</h3>
          {voice.supported ? <>
            <p>Activa el micrófono y permite su uso en el navegador. Di el nombre del apartado o una orden de la lista.</p>
            <button type="button" className="primary-button" onClick={voice.active ? voice.stop : voice.start}>{voice.active ? 'Apagar micrófono' : 'Activar voz'}</button>
            <p role="status">{voice.status}</p>
          </> : <p>Este navegador no admite reconocimiento de voz. Prueba en un navegador compatible, como Chrome, o usa el teclado.</p>}
          <ul><li>«Inicio», «catálogo» o «carrito»</li><li>«Iniciar sesión» o «mi cuenta»</li><li>«Subir», «bajar» o «volver arriba»</li><li>«Más información» para abrir una ficha</li><li>«Controles» para volver a la navegación</li><li>«Cerrar» para cerrar una ventana</li><li>«Detener voz» para apagar el micrófono</li></ul>
          <p className="accessibility-help">El navegador puede procesar la voz en línea. El micrófono solo se activa al pulsar Activar voz y se apaga al cambiar de pestaña. Los comandos no realizan cobros.</p>
        </section>
      </div>
    </AccessibleDialog>}
  </>, document.body);
}
