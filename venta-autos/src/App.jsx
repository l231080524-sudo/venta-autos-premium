import { useState, useEffect, useCallback, useRef } from 'react';
import { authHeaders } from './api';
import { vigilarInactividad } from './vigilarInactividad';
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
    const token = usuario.token;
    const expireListener = () => {
      if (usuarioRef.current?.token !== token) return;
      logout();
      setSessionMessage('Sesión caducada. Vuelve a iniciar sesión para continuar.');
    };
    const heartbeat = () => {
      void fetch(`${API_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).then(response => {
        if (response.status === 401) expireListener();
      }).catch(() => {});
    };
    window.addEventListener('autopremium:session-expired', expireListener);
    const detener = vigilarInactividad(expireListener, heartbeat);
    return () => {
      detener();
      window.removeEventListener('autopremium:session-expired', expireListener);
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
