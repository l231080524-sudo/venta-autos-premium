import { useEffect, useState } from 'react';
import { VistaAuthModal } from './AuthModal.vista.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AuthModal({ modalAuth, setModalAuth, onLogin }) {
  const [esRegistro, setEsRegistro] = useState(modalAuth.modoRegistro || false);
  const [paso, setPaso] = useState('credenciales');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [metodo, setMetodo] = useState('email');
  const [codigo, setCodigo] = useState('');
  const [desafio, setDesafio] = useState(null);
  const [esperaReenvio, setEsperaReenvio] = useState(0);

  useEffect(() => {
    if (paso !== 'codigo' || esperaReenvio <= 0) return undefined;
    const timer = window.setInterval(() => setEsperaReenvio(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [paso, esperaReenvio]);

  async function enviar(path, payload) {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  }

  const manejarEnvio = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = esRegistro ? '/api/auth/registro' : '/api/auth/login';
      const payload = esRegistro
        ? { nombre, email, password, telefono }
        : { email, password, method: metodo };
      const data = await enviar(endpoint, payload);
      setDesafio(data);
      setCodigo('');
      setPaso('codigo');
      setEsperaReenvio(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigo = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await enviar('/api/auth/verificar', { challengeId: desafio.challengeId, code: codigo });
      if (!data.usuario?.token || !data.usuario.email) throw new Error('No se pudo iniciar la sesión protegida.');
      onLogin(data.usuario);
      setModalAuth({ abierto: false, modoRegistro: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reenviarCodigo = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await enviar('/api/auth/reenviar-codigo', { challengeId: desafio.challengeId });
      setDesafio(data);
      setCodigo('');
      setEsperaReenvio(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const volver = () => {
    setPaso('credenciales');
    setDesafio(null);
    setCodigo('');
    setError(null);
  };

  const titulo = paso === 'codigo' ? (desafio?.requiereVerificacion ? 'Verifica tu correo' : 'Verificación en dos pasos')
    : esRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  const usaAutenticador = desafio?.method === 'totp';

  return <VistaAuthModal {...{
    setModalAuth, esRegistro, setEsRegistro, paso, error, setError, loading,
    nombre, setNombre, email, setEmail, password, setPassword, telefono,
    setTelefono, metodo, setMetodo, codigo, setCodigo, desafio, esperaReenvio,
    manejarEnvio, verificarCodigo, reenviarCodigo, volver, titulo,
    usaAutenticador,
  }} />;
}
