import Showroom from './components/Showroom';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importaciones
import Home from './pages/Home';
import CatalogoUnico from './pages/CatalogoUnico';
import Carrito from './pages/Carrito';
import AuthModal from './components/AuthModal';
import PagoResultado from './pages/PagoResultado';
import Chatbot from './components/Chatbot';
import { authHeaders } from './api';

export default function App() {
  // 🚀 INYECCIÓN DE LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario_premium');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [carritoCount, setCarritoCount] = useState(0);
  const [modalAuth, setModalAuth] = useState({ abierto: false, modoRegistro: false });
  const [sessionMessage, setSessionMessage] = useState('');
  const usuarioRef = useRef(usuario);
  useEffect(() => { usuarioRef.current = usuario; }, [usuario]);

  const logout = useCallback(() => {
    const activeUser = usuarioRef.current;
    if (activeUser?.token) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeUser.token}` },
      }).catch(() => {});
    }
    usuarioRef.current = null;
    setUsuario(null);
    localStorage.removeItem('usuario_premium');
    setCarritoCount(0);
    setModalAuth({ abierto:false, modoRegistro:false });
  }, [API_URL]);

  const actualizarConteoCarrito = useCallback(async () => {
    if (!usuario) {
      return;
    }
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados`, { headers: authHeaders(usuario) });
      if (response.ok) {
        const data = await response.json();
        setCarritoCount(data.length);
      } else if (response.status===401) window.dispatchEvent(new Event('autopremium:session-expired'));
    } catch (err) {
      console.error("Error actualizando badge del carrito:", err);
    }
  }, [usuario, API_URL]);

  useEffect(() => {
    // State updates occur only after the asynchronous inventory response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    actualizarConteoCarrito();
  }, [actualizarConteoCarrito]);

  useEffect(() => {
    if (!usuario?.token) return undefined;
    const idleLimit = 30 * 60 * 1000;
    let lastActivity = Date.now();
    let idleTimer;
    let heartbeatBusy = false;
    const scheduleExpiry = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(logout, idleLimit);
    };
    const markActivity = () => {
      if (Date.now() - lastActivity >= idleLimit) {
        logout();
        return;
      }
      lastActivity = Date.now();
      scheduleExpiry();
    };
    const heartbeat = async () => {
      if (heartbeatBusy || Date.now() - lastActivity >= 5 * 60 * 1000) return;
      heartbeatBusy = true;
      try {
        const response = await fetch(`${API_URL}/api/auth/heartbeat`, {
          method:'POST', headers:{ Authorization:`Bearer ${usuario.token}` },
        });
        if (response.status===401) window.dispatchEvent(new Event('autopremium:session-expired'));
      } catch {
        // La siguiente solicitud autenticada vuelve a validar la sesión si hay una interrupción de red.
      } finally { heartbeatBusy = false; }
    };
    const expireListener = () => {
      logout();
      setSessionMessage('Sesión caducada. Vuelve a iniciar sesión para continuar.');
    };
    const activityEvents = ['pointerdown','keydown','touchstart','scroll','wheel'];
    activityEvents.forEach(name => window.addEventListener(name,markActivity,{passive:true}));
    window.addEventListener('autopremium:session-expired',expireListener);
    const heartbeatTimer=window.setInterval(heartbeat,5*60*1000);
    scheduleExpiry();
    heartbeat();
    return () => {
      window.clearTimeout(idleTimer);
      window.clearInterval(heartbeatTimer);
      activityEvents.forEach(name => window.removeEventListener(name,markActivity));
      window.removeEventListener('autopremium:session-expired',expireListener);
    };
  }, [API_URL, logout, usuario?.token]);

  const login = (datosUsuario) => {
    usuarioRef.current = datosUsuario;
    setUsuario(datosUsuario);
    setSessionMessage('');
    localStorage.setItem('usuario_premium', JSON.stringify(datosUsuario));
    setModalAuth({ abierto: false, modoRegistro: false });
  };

  const agregarAlCarrito = async (vehiculoId) => {
    if (!usuario?.token) {
      setModalAuth({ abierto: true, modoRegistro: false });
      return;
    }
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(usuario) },
        body: JSON.stringify({ usuario_id: usuario.id, vehiculo_id: vehiculoId })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "No se pudo apartar el vehículo.");
        return;
      }
      actualizarConteoCarrito();
      alert("🎉 ¡Vehículo añadido exitosamente a tu Garaje de Apartados!");
    } catch (err) {
      console.error("Error al apartar vehículo:", err);
      alert("Error de conexión con el backend.");
    }
  };

  return (
    <BrowserRouter>
      <a className="skip-link" href="#contenido-principal">Saltar al contenido principal</a>
      <SiteHeader usuario={usuario} carritoCount={carritoCount} logout={logout} setModalAuth={setModalAuth} />
      {sessionMessage && <div role="alert" className="session-expired-banner">
        <span>{sessionMessage}</span>
        <button type="button" onClick={() => { setSessionMessage(''); setModalAuth({abierto:true,modoRegistro:false}); }}>Volver a iniciar sesión</button>
      </div>}
      {modalAuth.abierto && <AuthModal
        modalAuth={modalAuth}
        setModalAuth={setModalAuth}
        onLogin={login}
      />}
      <main id="contenido-principal" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<CatalogoUnico agregarAlCarrito={agregarAlCarrito} />} />
        <Route path="/carrito" element={<Carrito key={usuario?.id || "invitado"} usuario={usuario} setModalAuth={setModalAuth} actualizarConteoCarrito={actualizarConteoCarrito} />} />
        <Route path="/pago/:referencia" element={<PagoResultado usuario={usuario} setModalAuth={setModalAuth} actualizarConteoCarrito={actualizarConteoCarrito} />} />

        {/* Redirección de seguridad */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Showroom />
      </main>
      <SiteFooter />
      <Chatbot />
    </BrowserRouter>
  );
}
