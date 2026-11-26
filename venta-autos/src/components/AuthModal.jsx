import { useEffect, useState } from 'react';
import AccessibleDialog from './AccessibleDialog';

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

  return (
    <AccessibleDialog title={titulo} onClose={() => setModalAuth({ abierto: false, modoRegistro: false })}>
      <div className="p-8 pb-6">
        <h2 className="text-2xl font-black text-content tracking-normal uppercase mb-1">
          {paso === 'codigo' ? titulo : esRegistro ? 'Crear cuenta' : 'Acceso AutoPremium'}
        </h2>
        <p className="text-muted text-sm mb-6">
          {paso === 'codigo'
            ? usaAutenticador ? 'Abre tu app autenticadora y escribe el código actual de AutoPremium.'
              : `Enviamos un código a ${desafio?.destination || 'tu método de verificación'}. El código vence en 10 minutos.`
            : esRegistro ? 'Completa tus datos para crear una cuenta.' : 'Ingresa con tu correo y contraseña; después confirmarás con un código de un solo uso.'}
        </p>

        {error && <div role="alert" className="bg-panel border border-line text-content text-sm p-3 rounded mb-6 font-bold">{error}</div>}

        {paso === 'credenciales' ? (
          <form aria-busy={loading} onSubmit={manejarEnvio} className="space-y-4">
            {esRegistro && <div>
              <label htmlFor="auth-nombre" className="block text-sm text-muted font-bold mb-1.5">Nombre completo</label>
              <input id="auth-nombre" name="auth-nombre" autoComplete="name" required type="text" maxLength={100}
                value={nombre} onChange={event => setNombre(event.target.value)} placeholder="Ej. Hugo Becerra"
                className="w-full bg-surface border border-line rounded p-3 text-sm text-content" />
            </div>}

            <div>
              <label htmlFor="auth-email" className="block text-sm text-muted font-bold mb-1.5">Correo electrónico</label>
              <input id="auth-email" name="auth-email" autoComplete="email" required type="email" maxLength={150}
                value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@ejemplo.com"
                className="w-full bg-surface border border-line rounded p-3 text-sm text-content" />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm text-muted font-bold mb-1.5">Contraseña</label>
              <input id="auth-password" name="auth-password" autoComplete={esRegistro ? 'new-password' : 'current-password'}
                required type="password" minLength={esRegistro ? 8 : undefined} maxLength={256}
                value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••"
                className="w-full bg-surface border border-line rounded p-3 text-sm text-content" />
            </div>

            {esRegistro && <div>
              <label htmlFor="auth-telefono" className="block text-sm text-muted font-bold mb-1.5">Teléfono celular</label>
              <input id="auth-telefono" name="auth-telefono" autoComplete="tel" required type="tel" maxLength={30}
                value={telefono} onChange={event => setTelefono(event.target.value)} placeholder="+52 55 1234 5678"
                className="w-full bg-surface border border-line rounded p-3 text-sm text-content" />
            </div>}

            {!esRegistro && <fieldset className="space-y-2">
              <legend className="block text-sm text-muted font-bold mb-2">Segundo método de verificación</legend>
              <label className="flex items-center gap-2 text-sm text-content">
                <input type="radio" name="auth-method" value="email" checked={metodo === 'email'} onChange={() => setMetodo('email')} />
                Enviar código al correo
              </label>
              <label className="flex items-center gap-2 text-sm text-content">
                <input type="radio" name="auth-method" value="totp" checked={metodo === 'totp'} onChange={() => setMetodo('totp')} />
                Usar código de la app autenticadora
              </label>
            </fieldset>}

            <button type="submit" disabled={loading}
              className="w-full text-content font-bold py-4 rounded transition mt-2 text-sm bg-panel hover:bg-panel disabled:cursor-wait">
              {loading ? 'Procesando…' : esRegistro ? 'Crear cuenta y verificar correo' : 'Continuar con verificación'}
            </button>

            <div className="text-center pt-4 border-t border-line text-sm">
              <span className="text-muted">{esRegistro ? '¿Ya tienes cuenta?' : '¿Eres nuevo cliente?'}</span>{' '}
              <button type="button" onClick={() => { setEsRegistro(!esRegistro); setError(null); }}
                className="text-content font-bold uppercase tracking-normal">
                {esRegistro ? 'Inicia sesión' : 'Regístrate aquí'}
              </button>
            </div>
          </form>
        ) : (
          <form aria-busy={loading} onSubmit={verificarCodigo} className="space-y-4">
            <div>
              <label htmlFor="auth-otp" className="block text-sm text-muted font-bold mb-1.5">Código de seis dígitos</label>
              <input id="auth-otp" name="auth-otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}"
                required minLength={6} value={codigo}
                onChange={event => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" className="w-full bg-surface border border-line rounded p-3 text-lg tracking-[0.35em] text-content" />
            </div>
            <button type="submit" disabled={loading || codigo.length !== 6}
              className="w-full text-content font-bold py-4 rounded transition text-sm bg-panel hover:bg-panel disabled:cursor-not-allowed">
              {loading ? 'Verificando…' : 'Verificar e iniciar sesión'}
            </button>
            {!usaAutenticador && <button type="button" disabled={loading || esperaReenvio > 0} onClick={reenviarCodigo}
              className="w-full border border-line rounded p-3 text-sm text-content disabled:opacity-60">
              {esperaReenvio > 0 ? `Solicitar otro código en ${esperaReenvio} s` : 'Enviar otro código'}
            </button>}
            <button type="button" disabled={loading} onClick={volver} className="w-full text-sm underline text-muted">
              Volver al acceso
            </button>
          </form>
        )}
      </div>
    </AccessibleDialog>
  );
}
