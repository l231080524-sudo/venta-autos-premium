import { useState } from 'react';
import AccessibleDialog from './AccessibleDialog';

export default function AuthModal({ modalAuth, setModalAuth, onLogin }) {


  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [esRegistro, setEsRegistro] = useState(modalAuth.modoRegistro || false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = esRegistro ? '/api/auth/registro' : '/api/auth/login';
    const payload = esRegistro
      ? { nombre, email, password, telefono }
      : { email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || 'Error al validar las credenciales.');
      }

      const usuarioLogueado = data.usuario || data.user || data;

      if (!usuarioLogueado || !usuarioLogueado.email) {
        throw new Error('El servidor respondió, pero no se encontraron los datos del usuario.');
      }

      onLogin(usuarioLogueado);

      setModalAuth({ abierto: false, modoRegistro: false });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessibleDialog title={esRegistro ? 'Crear cuenta' : 'Iniciar sesión'} onClose={() => setModalAuth({ abierto: false, modoRegistro: false })}>
        <div className="p-8 pb-6">
          <h2 className="text-2xl font-black text-content tracking-normal uppercase mb-1">
            {esRegistro ? 'Crear Cuenta' : 'Acceso Premium'}
          </h2>
          <p className="text-muted text-sm uppercase tracking-normal mb-6">
            {esRegistro ? 'Únete a nuestra plataforma exclusiva' : 'Bienvenido de vuelta al showroom'}
          </p>

          {error && (
            <div role="alert" className="bg-panel border border-line text-content text-sm p-3 rounded mb-6 font-bold flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <p id="auth-required" className="text-muted mb-4">Todos los campos son obligatorios.</p>
          <form aria-describedby="auth-required" aria-busy={loading} onSubmit={manejarEnvio} className="space-y-4">

            {esRegistro && (
              <div>
                <label htmlFor="auth-nombre" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Nombre Completo</label>
                <input id="auth-nombre" name="auth-nombre" autoComplete="name"
                  required
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Hugo Becerra"
                  className="w-full bg-surface border border-line rounded p-3 text-sm  focus:border-line transition-colors text-content"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Correo Electrónico</label>
                <input id="auth-email" name="auth-email" autoComplete="email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-surface border border-line rounded p-3 text-sm  focus:border-line transition-colors text-content"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Contraseña de Seguridad</label>
                <input id="auth-password" name="auth-password" autoComplete={esRegistro ? "new-password" : "current-password"}
                required
                type="password"
                minLength={esRegistro ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border border-line rounded p-3 text-sm  focus:border-line transition-colors text-content"
              />
            </div>

            {esRegistro && (
              <div>
                <label htmlFor="auth-telefono" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Teléfono de Contacto</label>
                <input id="auth-telefono" name="auth-telefono" autoComplete="tel"
                  required
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full bg-surface border border-line rounded p-3 text-sm  focus:border-line transition-colors text-content"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-content font-bold uppercase tracking-normal py-4 rounded transition  mt-2 text-sm ${loading ? 'bg-panel cursor-not-allowed' : 'bg-panel hover:bg-panel'}`}
            >
              {loading ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Entrar'}
            </button>

            <div className="text-center pt-4 border-t border-line text-sm">
              <span className="text-muted">
                {esRegistro ? '¿Ya tienes una cuenta?' : '¿Eres un nuevo cliente?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => { setEsRegistro(!esRegistro); setError(null); }}
                className="text-content hover:text-content font-bold uppercase tracking-normal"
              >
                {esRegistro ? 'Inicia Sesión' : 'Regístrate aquí'}
              </button>
            </div>

          </form>
        </div>
    </AccessibleDialog>
  );
}
