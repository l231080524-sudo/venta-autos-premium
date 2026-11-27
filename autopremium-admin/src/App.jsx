import { useCallback, useState, useEffect } from 'react';
import { VistaPanel } from './Panel.vista.jsx';
import { VistaAcceso } from './Acceso.vista.jsx';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const ADMIN_ROLES = ['admin', 'superadmin', 'admin_restringido'];

async function authRequest(path, payload) {
  const response = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la verificación.');
  return data;
}

async function adminFetch(url, options = {}) {
  let session;
  try { session = JSON.parse(localStorage.getItem('admin_session')); } catch { session = null; }
  const response = await fetch(url, { ...options, headers: {
    ...options.headers, ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  } });
  if (response.status === 401) {
    if (session && localStorage.getItem('admin_session') === JSON.stringify(session)) {
      localStorage.removeItem('admin_session');
      window.dispatchEvent(new Event('admin-session-expired'));
    }
    throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
  }
  return response;
}

export default function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const guardado = localStorage.getItem('admin_session');
      const session = guardado ? JSON.parse(guardado) : null;
      return session?.token ? session : null;
    } catch { return null; }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [tabActiva, setTabActiva] = useState('resumen');
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [usuariosDb, setUsuariosDb] = useState([]);

  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmailPrefix, setAdminEmailPrefix] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('gasolina');
  const [imagen, setImagen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [stock, setStock] = useState(1);
  const [specsInput, setSpecsInput] = useState([{ clave: 'motor', valor: '' }]);

  const mostrarMensaje = useCallback((tipo, mensaje) => {
    setNotificacion({ tipo, mensaje });
    setTimeout(() => setNotificacion({ tipo: '', mensaje: '' }), 5000);
  }, []);

  const manejarLoginSeguro = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      if (!challenge) {
        const data = await authRequest('login', { email: loginEmail, password: loginPassword });
        if (!data.requiereCodigo || !data.challengeId) throw new Error('No pudo iniciarse la verificación.');
        setChallenge(data);
        setLoginPassword('');
        return;
      }

      const { usuario: usuarioLogueado } = await authRequest('verificar', { challengeId: challenge.challengeId, code: otp });
      if (!usuarioLogueado?.token || !ADMIN_ROLES.includes(usuarioLogueado.rol)) {
        setChallenge(null);
        setOtp('');
        throw new Error('Acceso reservado para administradores.');
      }
      setAdminUser(usuarioLogueado);
      localStorage.setItem('admin_session', JSON.stringify(usuarioLogueado));
      setChallenge(null);
      setOtp('');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const logoutAdmin = () => {
    void adminFetch(`${API_URL}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    setAdminUser(null);
    localStorage.removeItem('admin_session');
    setVehiculos([]);
    setUsuariosDb([]);
    setLoginEmail('');
    setLoginPassword('');
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoadingDatos(true);
      const [resVehiculos, resUsuarios] = await Promise.all([
        adminFetch(`${API_URL}/api/vehiculos`),
        adminFetch(`${API_URL}/api/usuarios`)
      ]);

      if (resVehiculos && resVehiculos.ok) setVehiculos(await resVehiculos.json());
      if (resUsuarios && resUsuarios.ok) setUsuariosDb(await resUsuarios.json());
    } catch (err) {
      mostrarMensaje('error', err.message);
    } finally {
      setLoadingDatos(false);
    }
  }, [mostrarMensaje]);

  useEffect(() => {
    if (!adminUser) return;
    const timer = setTimeout(cargarDatos, 0);
    const expire = () => {
      setAdminUser(null);
      setVehiculos([]);
      setUsuariosDb([]);
      setLoginError('Tu sesión venció. Vuelve a iniciar sesión.');
    };
    const check = () => { void adminFetch(`${API_URL}/api/auth/heartbeat`, { method: 'POST' }).catch(() => {}); };
    window.addEventListener('admin-session-expired', expire);
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('admin-session-expired', expire);
      window.removeEventListener('focus', check);
    };
  }, [adminUser, cargarDatos]);

  const totalStock = vehiculos.reduce((acc, auto) => acc + Number(auto.stock), 0);
  const valorInventario = vehiculos.reduce((acc, auto) => acc + (Number(auto.precio) * Number(auto.stock)), 0);
  const unidadesVendidas = usuariosDb.reduce((acc, user) => acc + Number(user.compras_totales || 0), 0);
  const ticketPromedioEstimado = vehiculos.length > 0 ? (vehiculos.reduce((acc, auto) => acc + Number(auto.precio), 0) / vehiculos.length) : 2500000;
  const gananciasTotales = unidadesVendidas * ticketPromedioEstimado;

  const crearVehiculo = async (e) => {
    e.preventDefault();
    const especificaciones = {};
    specsInput.forEach(s => { if (s.clave.trim()) especificaciones[s.clave.trim()] = s.valor.trim(); });
    const payload = { marca, modelo, anio: Number(anio), precio: Number(precio), categoria, imagen: imagen || 'https://images.unsplash.com/photo-1617788138017-80ad40651399', descripcion, stock: Number(stock), especificaciones };
    try {
      const response = await adminFetch(`${API_URL}/api/vehiculos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        mostrarMensaje('exito', '🎉 ¡Vehículo añadido!');
        setMarca(''); setModelo(''); setPrecio(''); setImagen(''); setDescripcion(''); setStock(1);
        cargarDatos();
      } else { const data = await response.json(); mostrarMensaje('error', data.error); }
    } catch { mostrarMensaje('error', 'Error de red.'); }
  };

  const handleSaveVehiculo = async (id, datos) => {
    try {
      const response = await adminFetch(`${API_URL}/api/vehiculos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      if (response.ok) { mostrarMensaje('exito', '✓ Registro actualizado.'); cargarDatos(); }
      else { const data = await response.json(); mostrarMensaje('error', data.error); }
    } catch { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const eliminarVehiculo = async (id) => {
    if (!window.confirm('¿Eliminar esta unidad del inventario central?')) return;
    try {
      const response = await adminFetch(`${API_URL}/api/vehiculos/${id}`, { method: 'DELETE' });
      if (response.ok) { mostrarMensaje('exito', 'Unidad dada de baja.'); cargarDatos(); }
      else { mostrarMensaje('error', 'No se pudo eliminar.'); }
    } catch { mostrarMensaje('error', 'Error de red.'); }
  };

  const registrarNuevoAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmailPrefix.trim()) return mostrarMensaje('error', 'Escribe un prefijo de correo válido.');

    const correoFinal = `${adminEmailPrefix.trim().toLowerCase()}@autopremium.com`;

    try {
      const response = await adminFetch(`${API_URL}/api/usuarios/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: adminNombre, email: correoFinal, password: adminPass })
      });
      if (response.ok) {
        mostrarMensaje('exito', `⚡ Cuenta directiva para [${adminNombre}] creada exitosamente.`);
        setAdminNombre(''); setAdminEmailPrefix(''); setAdminPass('');
        cargarDatos();
      } else {
        const data = await response.json(); mostrarMensaje('error', data.error || 'No se pudo registrar la cuenta.');
      }
    } catch { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const handleSaveUsuario = async (id, datos) => {
    try {
      const response = await adminFetch(`${API_URL}/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (response.ok) {
        mostrarMensaje('exito', 'Privilegios actualizados.');
        cargarDatos();
      } else {
        const data = await response.json();
        mostrarMensaje('error', data.error || 'Error al actualizar privilegios.');
      }
    } catch { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas REVOCAR EL ACCESO a este usuario permanentemente?')) return;
    try {
      const response = await adminFetch(`${API_URL}/api/usuarios/${id}`, { method: 'DELETE' });
      if (response.ok) { mostrarMensaje('exito', 'Cuenta revocada exitosamente.'); cargarDatos(); }
      else { const data = await response.json(); mostrarMensaje('error', data.error || 'Error al revocar cuenta.'); }
    } catch { mostrarMensaje('error', 'Error de red.'); }
  };

  const degradarCliente = async (id, comprasTotales) => {
    if (Number(comprasTotales) > 0) {
      return mostrarMensaje('error', '⛔ Acción denegada: No se puede degradar a un cliente que ya tiene compras.');
    }

    if (!window.confirm('¿Estás seguro de que deseas degradar/eliminar a este cliente?')) return;

    try {
      const response = await adminFetch(`${API_URL}/api/usuarios/${id}`, { method: 'DELETE' });
      if (response.ok) {
        mostrarMensaje('exito', 'Cliente degradado exitosamente.');
        cargarDatos();
      } else {
        const data = await response.json();
        mostrarMensaje('error', data.error || 'Error al degradar al cliente.');
      }
    } catch { mostrarMensaje('error', 'Error de conexión al degradar.'); }
  };

  const vehiculosFiltrados = vehiculos.filter(car => car.marca?.toLowerCase().includes(busqueda.toLowerCase()) || car.modelo?.toLowerCase().includes(busqueda.toLowerCase()));
  const clientesFiltrados = usuariosDb.filter(u => !['admin', 'superadmin', 'admin_restringido'].includes(u.rol));
  const adminsFiltrados = usuariosDb.filter(u => ['admin', 'superadmin', 'admin_restringido'].includes(u.rol));

  const agregarSpec = () => setSpecsInput([...specsInput, { clave: '', valor: '' }]);
  const cambiarSpec = (index, campo, valor) => {
    const nuevos = [...specsInput]; nuevos[index][campo] = valor; setSpecsInput(nuevos);
  };
  const eliminarSpec = (index) => setSpecsInput(specsInput.filter((_, i) => i !== index));

  const pestañasRenderizadas = [
    { id: 'resumen', etiqueta: 'Resumen Financiero' },
    (adminUser?.rol === 'superadmin' || adminUser?.rol === 'admin') ? { id: 'inventario', etiqueta: 'Gestión de Inventario' } : null,
    { id: 'clientes', etiqueta: `Clientes (${clientesFiltrados.length})` },
    { id: 'admins', etiqueta: `Staff / Directivos (${adminsFiltrados.length})` }
  ].filter(Boolean);

  if (!adminUser) {
    return <VistaAcceso {...{
      loginEmail, setLoginEmail, loginPassword, setLoginPassword, challenge,
      setChallenge, otp, setOtp, loginError, setLoginError, loginLoading,
      manejarLoginSeguro,
    }} />;
  }

  return <VistaPanel {...{
    adminUser, tabActiva, setTabActiva, notificacion, loadingDatos, busqueda,
    setBusqueda, adminNombre, setAdminNombre, adminEmailPrefix,
    setAdminEmailPrefix, adminPass, setAdminPass, marca, setMarca, modelo,
    setModelo, anio, setAnio, precio, setPrecio, categoria, setCategoria,
    imagen, setImagen, descripcion, setDescripcion, specsInput, logoutAdmin,
    totalStock, valorInventario, unidadesVendidas, gananciasTotales,
    crearVehiculo, handleSaveVehiculo, eliminarVehiculo, registrarNuevoAdmin,
    handleSaveUsuario, eliminarUsuario, degradarCliente, vehiculosFiltrados,
    clientesFiltrados, adminsFiltrados, agregarSpec, cambiarSpec, eliminarSpec,
    pestañasRenderizadas,
  }} />;
}
