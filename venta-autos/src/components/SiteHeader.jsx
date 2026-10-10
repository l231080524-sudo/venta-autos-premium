import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

export default function SiteHeader({ usuario, carritoCount, logout, setModalAuth }) {
  const { pathname, hash, key } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState(() => readPreference('ap-theme', 'dark'));
  const [scale, setScale] = useState(() => readPreference('ap-text-size', '100'));
  const menuButton = useRef(null);
  const previousKey = useRef(key);
  const header = useRef(null);
  const profileButton = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.style.fontSize = `${['100', '125', '150', '175', '200'].includes(scale) ? scale : '100'}%`;
    try { localStorage.setItem('ap-theme', theme); localStorage.setItem('ap-text-size', scale); } catch { /* Preferences still work without storage. */ }
  }, [theme, scale]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${header.current.getBoundingClientRect().height}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${pathname === '/catalogo' ? 'Catálogo' : pathname === '/carrito' ? 'Carrito' : 'Inicio'} | AutoPremium CDMX`;
    if (previousKey.current === key && !hash) return;
    // Location keys also change when the user clicks the current route again.
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
      if (!header.current.contains(event.target)) { setProfileOpen(false); setMenuOpen(false); }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  const closePanels = () => { setMenuOpen(false); setProfileOpen(false); };

  return (
    <header ref={header} className="site-header print:hidden" onKeyDown={(event) => {
      if (event.key === 'Escape') {
        if (profileOpen) { setProfileOpen(false); profileButton.current?.focus(); }
        else if (menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
      }
    }}>
      <div className="header-row">
        <NavLink to="/" className="brand" onClick={closePanels}>AutoPremium <span>CDMX</span></NavLink>
        <nav id="navegacion-principal" aria-label="Principal" className={`site-nav ${menuOpen ? 'is-open' : ''}`}>
          <NavLink to="/" end onClick={closePanels}>Inicio</NavLink>
          <NavLink to="/catalogo" onClick={closePanels}>Catálogo</NavLink>
          <Link to={`${pathname}#mapa-showroom`} onClick={closePanels}>Dónde encontrarnos</Link>
          <NavLink to="/carrito" onClick={closePanels}>Carrito ({carritoCount})</NavLink>
        </nav>
        <div className="header-actions">
          <button ref={menuButton} className="menu-toggle" aria-expanded={menuOpen} aria-controls="navegacion-principal" onClick={() => { setMenuOpen(!menuOpen); setProfileOpen(false); if (!menuOpen) requestAnimationFrame(() => document.querySelector("#navegacion-principal a")?.focus()); }}>
            <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Menú'}</span><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
          </button>
          <div className="profile-disclosure" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
            <button ref={profileButton} className="profile-trigger" aria-label="Cuenta y preferencias" aria-expanded={profileOpen} aria-controls="panel-cuenta"
              onClick={() => { setProfileOpen(!profileOpen); setMenuOpen(false); }}>
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
              </svg>
            </button>
            {profileOpen && <section id="panel-cuenta" className="profile-panel" aria-labelledby="cuenta-titulo">
              <div className="profile-heading"><h2 id="cuenta-titulo">{usuario ? 'Mi cuenta' : 'Tu cuenta'}</h2><button aria-label="Cerrar cuenta y preferencias" onClick={() => { setProfileOpen(false); profileButton.current?.focus(); }}>×</button></div>
              {usuario ? <p className="profile-name">{usuario.nombre}</p> :
                <button className="primary-button" onClick={() => {
                  profileButton.current?.focus(); setProfileOpen(false);
                  setModalAuth({ abierto: true, modoRegistro: false });
                }}>Iniciar sesión</button>}
              <div className="reading-controls">
                <label htmlFor="theme-choice">Apariencia
                  <select id="theme-choice" value={theme} onChange={(event) => setTheme(event.target.value)}>
                    <option value="dark">Modo oscuro</option><option value="light">Modo claro</option>
                  </select>
                </label>
                <label htmlFor="text-choice">Tamaño del texto
                  <select id="text-choice" value={scale} onChange={(event) => setScale(event.target.value)}>
                    {['100', '125', '150', '175', '200'].map(value => <option key={value} value={value}>{value} %</option>)}
                  </select>
                </label>
              </div>
              {usuario && <button className="logout-button" onClick={() => { profileButton.current?.focus(); logout(); }}>Cerrar sesión</button>}
            </section>}
          </div>
        </div>

      </div>
    </header>
  );
}
