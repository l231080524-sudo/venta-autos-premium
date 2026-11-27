import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavegacionDocumento from './NavegacionDocumento';
import SiteHeader from './components/SiteHeader';
import CatalogoUnico from './pages/CatalogoUnico';
import Carrito from './pages/Carrito';
import AuthModal from './components/AuthModal';
import PagoResultado from './pages/PagoResultado';
import Chatbot from './components/Chatbot';

export function VistaSitio({
  usuario, carritoCount, modalAuth, setModalAuth, sessionMessage,
  setSessionMessage, logout, actualizarConteoCarrito, login, agregarAlCarrito,
}) {
  return (
    <BrowserRouter>
      <NavegacionDocumento />
      <SiteHeader usuario={usuario} logout={logout} setModalAuth={setModalAuth} />
      {createPortal(carritoCount, document.getElementById('conteo-carrito'))}
      {createPortal(
        <>
          {sessionMessage && <div role="alert" className="session-expired-banner">
            <span>{sessionMessage}</span>
            <button type="button" onClick={() => {
              setSessionMessage('');
              setModalAuth({ abierto: true, modoRegistro: false });
            }}>Volver a iniciar sesión</button>
          </div>}
          {modalAuth.abierto && <AuthModal modalAuth={modalAuth} setModalAuth={setModalAuth} onLogin={login} />}
        </>,
        document.getElementById('avisos-y-acceso'),
      )}
      {createPortal(
        <Routes>
          <Route path="/" element={null} />
          <Route path="/catalogo" element={<CatalogoUnico agregarAlCarrito={agregarAlCarrito} />} />
          <Route path="/carrito" element={<Carrito key={usuario?.id || 'invitado'} usuario={usuario} setModalAuth={setModalAuth} actualizarConteoCarrito={actualizarConteoCarrito} />} />
          <Route path="/pago/:referencia" element={<PagoResultado usuario={usuario} setModalAuth={setModalAuth} actualizarConteoCarrito={actualizarConteoCarrito} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>,
        document.getElementById('paginas-interactivas'),
      )}
      {createPortal(<Chatbot />, document.getElementById('chatbot'))}
    </BrowserRouter>
  );
}
