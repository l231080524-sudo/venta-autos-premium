import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoiceNavigation from '../useVoiceNavigation';
import { focusNavigation, isEditing, returnToTop, scrollPage, showVehicleDetails } from '../navigationActions';
import { VistaAccessibilityWidget } from './AccessibilityWidget.vista.jsx';

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

  return <VistaAccessibilityWidget {...{ settings, open, setOpen, launcher, keyboard, voice }} />;
}
