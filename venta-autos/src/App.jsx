import { useState, useEffect, useCallback, useRef } from 'react';
import { authHeaders } from './api';
import { VistaSitio } from './App.vista.jsx';

export default function App() {
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

  return <VistaSitio {...{
    usuario, carritoCount, modalAuth, setModalAuth, sessionMessage,
    setSessionMessage, logout, actualizarConteoCarrito, login, agregarAlCarrito,
  }} />;
}
