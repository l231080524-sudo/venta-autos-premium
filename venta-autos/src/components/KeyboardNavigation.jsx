import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { isEditing, returnToTop, scrollPage, showVehicleDetails } from '../navigationActions';

export default function KeyboardNavigation({ onAccount, signedIn, onDisable, onNavigate }) {
  const controls = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    function handleKey(event) {
      if (event.defaultPrevented || event.isComposing || document.querySelector('dialog[open]')) return;
      if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (isEditing(event.target)) return;
      const links = { '1': '/', '2': '/catalogo', '3': '/carrito' };
      if (event.key === '0' || event.key === 'Home') {
        event.preventDefault(); returnToTop();
      } else if (links[event.key]) {
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
        showVehicleDetails();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onAccount]);

  return <section ref={controls} className="keyboard-controls" aria-labelledby="keyboard-controls-title">
    <div className="keyboard-controls-heading"><h2 id="keyboard-controls-title">Controles de navegación por teclado</h2><button type="button" onClick={onDisable}>Desactivar</button></div>
    <p><kbd>F6</kbd>: volver a los controles desde cualquier punto. <kbd>0</kbd> o <kbd>Ctrl + Inicio</kbd>: volver arriba. <kbd>Tab</kbd>: moverte · <kbd>Enter</kbd>: elegir · <kbd>Esc</kbd>: cerrar.</p>
    <div className="keyboard-controls-actions">
      <NavLink to="/" end onClick={onNavigate} aria-keyshortcuts="1">Inicio <kbd>1</kbd></NavLink>
      <NavLink to="/catalogo" onClick={onNavigate} aria-keyshortcuts="2">Catálogo <kbd>2</kbd></NavLink>
      <NavLink to="/carrito" onClick={onNavigate} aria-keyshortcuts="3">Carrito <kbd>3</kbd></NavLink>
      <button type="button" data-keyboard-account onClick={onAccount} aria-keyshortcuts="4">{signedIn ? 'Mi cuenta' : 'Iniciar sesión'} <kbd>4</kbd></button>
      {pathname === '/catalogo' && <button type="button" onClick={showVehicleDetails} aria-keyshortcuts="5">Más información <kbd>5</kbd></button>}
      <button type="button" onClick={returnToTop} aria-keyshortcuts="0">Volver arriba <kbd>0</kbd></button>
      <button type="button" onClick={() => scrollPage(-1)} aria-keyshortcuts="ArrowUp">Subir <kbd>↑</kbd></button>
      <button type="button" onClick={() => scrollPage(1)} aria-keyshortcuts="ArrowDown">Bajar <kbd>↓</kbd></button>
    </div>
    <p className="keyboard-writing-note">Puedes pulsar el número del botón. Mientras escribes, los atajos se pausan.</p>
  </section>;
}
