import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function KeyboardNavigation({ onAccount, signedIn, onDisable, onNavigate }) {
  const controls = useRef(null);
  const { pathname } = useLocation();

  function scrollPage(direction) {
    const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    window.scrollBy({ top: direction * Math.max(100, (window.innerHeight - headerHeight) * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function focusControl(direction) {
    const targets = [...document.querySelectorAll('#contenido-principal a[href], #contenido-principal button, #contenido-principal input, #contenido-principal select, #contenido-principal textarea, #contenido-principal summary')]
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    if (!targets.length) return;
    const index = targets.indexOf(document.activeElement);
    const target = index === -1 ? (direction > 0 ? targets[0] : targets.at(-1)) : targets[(index + direction + targets.length) % targets.length];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function showDetails() {
    const currentCard = document.activeElement?.closest('.car-card');
    const buttons = [...document.querySelectorAll('#contenido-principal .car-details-button')];
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const target = currentCard?.querySelector('.car-details-button') || buttons.find(button => {
      const bounds = button.closest('.car-card').getBoundingClientRect();
      return bounds.bottom > headerBottom && bounds.top < window.innerHeight;
    }) || buttons[0];
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    target.click();
  }

  useEffect(() => {
    function handleKey(event) {
      if (event.defaultPrevented || event.isComposing || document.querySelector('dialog[open]')) return;
      if (event.code === 'F6' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        controls.current?.querySelector('a')?.focus();
        return;
      }
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
      const links = { Digit1: '/', Digit2: '/catalogo', Digit3: '/carrito' };
      if (links[event.code]) {
        event.preventDefault();
        controls.current?.querySelector(`a[href="${links[event.code]}"]`)?.click();
      } else if (event.code === 'KeyL') {
        event.preventDefault();
        // Give dialogs a visible trigger to restore focus to after closing.
        controls.current?.querySelector('[data-keyboard-account]')?.focus();
        onAccount();
      } else if (event.code === 'KeyN' || event.code === 'KeyP') {
        event.preventDefault();
        focusControl(event.code === 'KeyN' ? 1 : -1);
      } else if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        event.preventDefault();
        scrollPage(event.code === 'ArrowDown' ? 1 : -1);
      } else if (event.code === 'KeyF' && document.querySelector('.car-details-button')) {
        event.preventDefault();
        showDetails();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onAccount]);

  return <section ref={controls} className="keyboard-controls" aria-labelledby="keyboard-controls-title">
    <div className="keyboard-controls-heading"><h2 id="keyboard-controls-title">Controles de navegación por teclado</h2><button type="button" onClick={onDisable}>Desactivar</button></div>
    <p>Tab: siguiente control · Mayús + Tab: anterior · Enter o Espacio: activar botones · Escape: cerrar ventanas · F6: volver a estos controles.</p>
    <div className="keyboard-controls-actions">
      <NavLink to="/" end onClick={onNavigate} aria-keyshortcuts="Alt+Shift+1">Inicio <kbd>Alt + Mayús + 1</kbd></NavLink>
      <NavLink to="/catalogo" onClick={onNavigate} aria-keyshortcuts="Alt+Shift+2">Catálogo <kbd>Alt + Mayús + 2</kbd></NavLink>
      <NavLink to="/carrito" onClick={onNavigate} aria-keyshortcuts="Alt+Shift+3">Carrito <kbd>Alt + Mayús + 3</kbd></NavLink>
      <button type="button" data-keyboard-account onClick={onAccount} aria-keyshortcuts="Alt+Shift+L">{signedIn ? 'Mi cuenta' : 'Iniciar sesión'} <kbd>Alt + Mayús + L</kbd></button>
      <button type="button" onClick={() => scrollPage(-1)} aria-keyshortcuts="Alt+Shift+ArrowUp">Subir <kbd>Alt + Mayús + ↑</kbd></button>
      <button type="button" onClick={() => scrollPage(1)} aria-keyshortcuts="Alt+Shift+ArrowDown">Bajar <kbd>Alt + Mayús + ↓</kbd></button>
      <button type="button" onClick={() => focusControl(-1)} aria-keyshortcuts="Alt+Shift+P">Control anterior <kbd>Alt + Mayús + P</kbd></button>
      <button type="button" onClick={() => focusControl(1)} aria-keyshortcuts="Alt+Shift+N">Siguiente control <kbd>Alt + Mayús + N</kbd></button>
      <button type="button" onClick={showDetails} disabled={pathname !== '/catalogo'} aria-keyshortcuts="Alt+Shift+F">Ficha del vehículo <kbd>Alt + Mayús + F</kbd></button>
    </div>
  </section>;
}
