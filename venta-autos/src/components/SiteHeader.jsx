import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { VistaSiteHeader } from './SiteHeader.vista.jsx';

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

const header = document.getElementById("encabezado-principal");
const nav = document.getElementById("navegacion-principal");

export default function SiteHeader({ usuario, logout, setModalAuth }) {
  const { pathname, hash, key } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authenticatorUser, setAuthenticatorUser] = useState(null);
  const [theme, setTheme] = useState(() => readPreference('ap-theme', 'dark'));
  const [scale, setScale] = useState(() => readPreference('ap-text-size', '100'));
  const [contrast, setContrast] = useState(() => readPreference('ap-contrast', 'false') === 'true');
  const [monochrome, setMonochrome] = useState(() => readPreference('ap-monochrome', 'false') === 'true');
  const [keyboard, setKeyboard] = useState(() => readPreference('ap-keyboard', 'false') === 'true');
  const menuButton = useRef(null);
  const previousKey = useRef(key);
  const profileButton = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.style.fontSize = `${['100', '125', '150', '175', '200'].includes(scale) ? scale : '100'}%`;
    try { localStorage.setItem('ap-theme', theme); localStorage.setItem('ap-text-size', scale); } catch {   }
  }, [theme, scale]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = String(contrast);
    root.dataset.monochrome = String(monochrome);
    root.dataset.keyboard = String(keyboard);
    try {
      localStorage.setItem('ap-contrast', String(contrast));
      localStorage.setItem('ap-monochrome', String(monochrome));
      localStorage.setItem('ap-keyboard', String(keyboard));
    } catch {   }
  }, [contrast, monochrome, keyboard]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${pathname === '/catalogo' ? 'Catálogo' : pathname === '/carrito' ? 'Carrito' : pathname.startsWith('/pago/') ? 'Estado del pago' : 'Inicio'} | AutoPremium CDMX`;
    if (previousKey.current === key && !hash) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash ? hash.slice(1) : 'contenido-principal');
      target?.focus({ preventScroll: true });
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      if (hash) target?.scrollIntoView({ behavior, block: 'start' });
      else window.scrollTo({ top: 0, behavior });
      previousKey.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);

  useEffect(() => {
    function closeOutside(event) {
      if (!header.contains(event.target)) { setProfileOpen(false); setMenuOpen(false); }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  const closePanels = useCallback(() => { setMenuOpen(false); setProfileOpen(false); }, []);

  useLayoutEffect(() => {
    nav.classList.toggle("is-open", menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key !== "Escape") return;
      if (profileOpen) { setProfileOpen(false); profileButton.current?.focus(); }
      else if (menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
    }
    header.addEventListener("keydown", closeWithEscape);
    return () => header.removeEventListener("keydown", closeWithEscape);
  }, [menuOpen, profileOpen]);

  useEffect(() => {
    function closeOnNavigation(event) {
      if (event.target instanceof Element && event.target.closest(".brand, .site-nav a")) closePanels();
    }
    header.addEventListener("click", closeOnNavigation);
    return () => header.removeEventListener("click", closeOnNavigation);
  }, [closePanels]);
  const keyboardAccount = useCallback(() => {
    setMenuOpen(false);
    if (usuario) { setProfileOpen(true); requestAnimationFrame(() => profileButton.current?.focus()); }
    else { setProfileOpen(false); setModalAuth({ abierto: true, modoRegistro: false }); }
  }, [usuario, setModalAuth]);

  return <VistaSiteHeader {...{
    usuario, logout, setModalAuth, menuOpen,
    setMenuOpen, profileOpen, setProfileOpen, authenticatorUser,
    setAuthenticatorUser, theme, setTheme, scale, setScale, contrast,
    setContrast, monochrome, setMonochrome, keyboard, setKeyboard, menuButton,
    profileButton, closePanels, keyboardAccount,
  }} />;
}
