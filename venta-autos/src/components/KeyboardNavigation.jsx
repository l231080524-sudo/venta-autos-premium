import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isEditing, returnToTop, scrollPage, showVehicleDetails } from '../navigationActions';
import { VistaKeyboardNavigation } from './KeyboardNavigation.vista.jsx';

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

  return <VistaKeyboardNavigation {...{ onAccount, signedIn, onDisable, onNavigate, controls, pathname }} />;
}
