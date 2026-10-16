import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function KeyboardNavigation({ onAccount, signedIn, onDisable, onNavigate }) {
  const controls = useRef(null);
  const { pathname } = useLocation();

  function scrollPage(direction) {
    const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    window.scrollBy({ top: direction * Math.max(100, (window.innerHeight - headerHeight) * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
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
      if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"]')) return;
      const links = { '1': '/', '2': '/catalogo', '3': '/carrito' };
      if (links[event.key]) {
        event.preventDefault();
        controls.current?.querySelector(`a[href="${links[event.key]}"]`)?.click();
      } else if (event.key === '4') {
        event.preventDefault();
        // Give dialogs a visible trigger to restore focus to after closing.
        controls.current?.querySelector('[data-keyboard-account]')?.focus();
        onAccount();
      } else if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        event.preventDefault();
        scrollPage(event.code === 'ArrowDown' ? 1 : -1);
      } else if (event.key === '5' && document.querySelector('.car-details-button')) {
        event.preventDefault();
        showDetails();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onAccount]);

  return <section ref={controls} className="keyboard-controls" aria-labelledby="keyboard-controls-title">
    <div className="keyboard-controls-heading"><h2 id="keyboard-controls-title">Controles de navegación por teclado</h2><button type="button" onClick={onDisable}>Desactivar</button></div>
    <p>Usa <kbd>Tab</kbd> para moverte y <kbd>Enter</kbd> para elegir. <kbd>Esc</kbd> cierra las ventanas. <kbd>F6</kbd> vuelve a estos botones.</p>
    <div className="keyboard-controls-actions">
      <NavLink to="/" end onClick={onNavigate} aria-keyshortcuts="1">Inicio <kbd>1</kbd></NavLink>
      <NavLink to="/catalogo" onClick={onNavigate} aria-keyshortcuts="2">Catálogo <kbd>2</kbd></NavLink>
      <NavLink to="/carrito" onClick={onNavigate} aria-keyshortcuts="3">Carrito <kbd>3</kbd></NavLink>
      <button type="button" data-keyboard-account onClick={onAccount} aria-keyshortcuts="4">{signedIn ? 'Mi cuenta' : 'Iniciar sesión'} <kbd>4</kbd></button>
      {pathname === '/catalogo' && <button type="button" onClick={showDetails} aria-keyshortcuts="5">Más información <kbd>5</kbd></button>}
      <button type="button" onClick={() => scrollPage(-1)} aria-keyshortcuts="ArrowUp">Subir <kbd>↑</kbd></button>
      <button type="button" onClick={() => scrollPage(1)} aria-keyshortcuts="ArrowDown">Bajar <kbd>↓</kbd></button>
    </div>
    <p className="keyboard-writing-note">Puedes pulsar el número del botón. Mientras escribes, los atajos se pausan.</p>
  </section>;
}
