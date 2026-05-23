import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthModal({ modalAuth, setModalAuth, onLogin }) {
  const navigate = useNavigate();

  // 1. AQUÍ AGREGAMOS LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [esRegistro, setEsRegistro] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');

  // Sincroniza la vista cuando el modal se abre
  useEffect(() => {
    if (modalAuth?.abierto) {
      setEsRegistro(modalAuth.modoRegistro || false);
      setError(null);
      setLoading(false);
    }
  }, [modalAuth?.abierto, modalAuth?.modoRegistro]);

  // Si no está abierto, no renderizamos nada
  if (!modalAuth || !modalAuth.abierto) return null;

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = esRegistro ? '/api/auth/registro' : '/api/auth/login';
    const payload = esRegistro 
      ? { nombre, email, password, telefono }
      : { email, password };

    try {
      // 2. CAMBIAMOS EL FETCH PARA USAR API_URL
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || 'Error al validar las credenciales.');
      }

      // 🛡️ SOLUCIÓN ROBUSTA: Extraemos el usuario sin importar cómo lo mande el Backend
      const usuarioLogueado = data.usuario || data.user || data;

      if (!usuarioLogueado || !usuarioLogueado.email) {
        throw new Error('El servidor respondió, pero no se encontraron los datos del usuario.');
      }

      // 🚀 REDIRECCIÓN MÁGICA: Si el correo es de la agencia, le forzamos el rol de admin
      if (usuarioLogueado.email.endsWith('@autopremium.com')) {
        usuarioLogueado.rol = 'admin';
      }

      // 1. Iniciar sesión en la app
      onLogin(usuarioLogueado);
      
      // 2. Cerrar el modal flotante
      setModalAuth({ abierto: false, modoRegistro: false });

    } catch (err) {
      // Ahora si hay un error, sí lo mostrará en el recuadro rojo
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={() => setModalAuth({ abierto: false, modoRegistro: false })}
      ></div>
      
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        
        <button 
          onClick={() => setModalAuth({ abierto: false, modoRegistro: false })}
          className="absolute top-4 right-5 text-zinc-500 hover:text-white transition text-xl font-bold"
        >
          ✕
        </button>

        <div className="p-8 pb-6">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
            {esRegistro ? 'Crear Cuenta' : 'Acceso Premium'}
          </h2>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-6">
            {esRegistro ? 'Únete a nuestra plataforma exclusiva' : 'Bienvenido de vuelta al showroom'}
          </p>

          {error && (
            <div className="bg-red-950/50 border border-red-900/50 text-red-500 text-xs p-3 rounded mb-6 font-bold flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={manejarEnvio} className="space-y-4">
            
            {esRegistro && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Nombre Completo</label>
                <input 
                  required 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Hugo Becerra" 
                  className="w-full bg-black border border-zinc-900 rounded p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Correo Electrónico</label>
              <input 
                required 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com" 
                className="w-full bg-black border border-zinc-900 rounded p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Contraseña de Seguridad</label>
              <input 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-black border border-zinc-900 rounded p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
              />
            </div>

            {esRegistro && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Teléfono de Contacto</label>
                <input 
                  required 
                  type="tel" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="55 1234 5678" 
                  className="w-full bg-black border border-zinc-900 rounded p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white font-bold uppercase tracking-widest py-4 rounded transition shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-2 text-xs ${loading ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {loading ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Entrar'}
            </button>

            <div className="text-center pt-4 border-t border-zinc-900 text-xs">
              <span className="text-zinc-500">
                {esRegistro ? '¿Ya tienes una cuenta?' : '¿Eres un nuevo cliente?'}
              </span>{' '}
              <button 
                type="button"
                onClick={() => { setEsRegistro(!esRegistro); setError(null); }}
                className="text-blue-500 hover:text-blue-400 font-bold uppercase tracking-widest"
              >
                {esRegistro ? 'Inicia Sesión' : 'Regístrate aquí'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}