import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importaciones
import Home from './pages/Home';
import CatalogoUnico from './pages/CatalogoUnico';
import Carrito from './pages/Carrito';
import AuthModal from './components/AuthModal';

export default function App() {
  // 🚀 INYECCIÓN DE LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario_premium');
      return guardado ? JSON.parse(guardado) : null;
    } catch (e) {
      return null;
    }
  });

  const [carritoCount, setCarritoCount] = useState(0);
  const [modalAuth, setModalAuth] = useState({ abierto: false, modoRegistro: false });

  const actualizarConteoCarrito = async () => {
    if (!usuario) {
      setCarritoCount(0);
      return;
    }
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados?usuario_id=${usuario.id}`);
      if (response.ok) {
        const data = await response.json();
        setCarritoCount(data.length);
      }
    } catch (err) {
      console.error("Error actualizando badge del carrito:", err);
    }
  };

  useEffect(() => {
    actualizarConteoCarrito();
  }, [usuario]);

  const login = (datosUsuario) => {
    setUsuario(datosUsuario);
    localStorage.setItem('usuario_premium', JSON.stringify(datosUsuario));
    setModalAuth({ abierto: false, modoRegistro: false });
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('usuario_premium');
    setCarritoCount(0);
  };

  const agregarAlCarrito = async (vehiculoId) => {
    if (!usuario) {
      setModalAuth({ abierto: true, modoRegistro: false });
      return;
    }
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <AuthModal 
        modalAuth={modalAuth} 
        setModalAuth={setModalAuth} 
        onLogin={login} 
      />
      <Routes>
        <Route path="/" element={<Home setModalAuth={setModalAuth} usuario={usuario} carritoCount={carritoCount} logout={logout} />} />
        <Route path="/catalogo" element={<CatalogoUnico setModalAuth={setModalAuth} usuario={usuario} carritoCount={carritoCount} logout={logout} agregarAlCarrito={agregarAlCarrito} />} />
        <Route path="/carrito" element={<Carrito usuario={usuario} logout={logout} setModalAuth={setModalAuth} actualizarConteoCarrito={actualizarConteoCarrito} />} />
        
        {/* Redirección de seguridad */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}