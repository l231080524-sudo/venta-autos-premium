import React, { useState, useEffect } from 'react';

// ==========================================
// COMPONENTE: TARJETA DE EDICIÓN DE AUTO
// ==========================================
function AdminCarCard({ auto, onDelete, onSave }) {
  const [marca, setMarca] = useState(auto.marca || '');
  const [modelo, setModelo] = useState(auto.modelo || '');
  const [precio, setPrecio] = useState(auto.precio || '');
  const [stock, setStock] = useState(auto.stock || 0);
  // NUEVO ESTADO: Categoría
  const [categoria, setCategoria] = useState(auto.categoria || 'gasolina');

  // NUEVA CONDICIÓN: Verificar si la categoría fue modificada
  const isModified = 
    marca !== auto.marca || 
    modelo !== auto.modelo || 
    Number(precio) !== Number(auto.precio) || 
    Number(stock) !== Number(auto.stock) ||
    categoria !== auto.categoria;

  // NUEVO GUARDADO: Incluir la categoría en la actualización
  const handleSave = () => onSave(auto.id, { 
    marca, 
    modelo, 
    precio: Number(precio), 
    stock: Number(stock), 
    categoria 
  });

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden flex flex-col hover:border-zinc-700/50 transition-all shadow-xl group">
      <div className="relative h-48 bg-black overflow-hidden">
        <img src={auto.imagen} alt={auto.modelo} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" onError={(e) => e.target.src = "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80"}/>
        <span className="absolute top-4 right-4 text-[9px] font-black px-3 py-1.5 uppercase tracking-widest rounded-full bg-black/60 text-white border border-zinc-700/50 backdrop-blur-md">{auto.categoria}</span>
        {Number(auto.stock) <= 0 && (
          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-red-600 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)]">Sin Stock</span>
          </div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Marca</label>
            <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full bg-black/50 border border-zinc-800 focus:border-zinc-500 rounded-lg p-2 text-xs text-white focus:outline-none font-bold transition" />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Modelo</label>
            <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full bg-black/50 border border-zinc-800 focus:border-zinc-500 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none transition" />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Precio (MXN)</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full bg-black/50 border border-zinc-800 focus:border-zinc-500 rounded-lg p-2 text-xs text-emerald-400 focus:outline-none font-mono font-bold transition" />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Stock Disp.</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={`w-full bg-black/50 border focus:border-zinc-500 rounded-lg p-2 text-xs text-white focus:outline-none font-mono font-bold transition ${Number(stock) <= 0 ? 'border-red-900/50 text-red-500' : 'border-zinc-800'}`} />
          </div>
          
          {/* NUEVO SELECTOR DE CATEGORÍA */}
          <div className="col-span-2">
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Categoría Vehicular</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-black/50 border border-zinc-800 focus:border-zinc-500 rounded-lg p-2 text-xs text-white focus:outline-none uppercase font-bold transition">
              <option value="gasolina">Gasolina</option>
              <option value="hibrido">Híbrido</option>
              <option value="electrico">Eléctrico</option>
              <option value="superdeportivo">Superdeportivo</option>
            </select>
          </div>
        </div>
        <div className="mt-auto pt-2 flex gap-3">
          {isModified && <button onClick={handleSave} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] transition duration-300">Guardar</button>}
          <button onClick={() => onDelete(auto.id)} className={`border border-red-900/40 text-red-500 hover:bg-red-950/40 hover:text-red-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition duration-300 ${isModified ? 'px-4' : 'flex-1'}`}>Borrar</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: TARJETA DE USUARIO / STAFF
// ==========================================
function AdminUserCard({ admin, onDelete, onSave, usuarioActualId }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(admin.nombre);
  const [rol, setRol] = useState(admin.rol || 'admin');

  const esUsuarioActual = admin.id === usuarioActualId;

  const handleSave = () => {
    onSave(admin.id, { nombre, rol });
    setEditando(false);
  };

  return (
    <div className="bg-black/40 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between items-start gap-4 transition hover:border-zinc-700">
      {!editando ? (
        <>
          <div className="w-full">
            <div className="flex justify-between items-start w-full">
              <p className="text-sm font-black uppercase text-white truncate pr-2">{admin.nombre}</p>
              <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${admin.rol === 'superadmin' ? 'bg-purple-500/10 text-purple-400 border border-purple-900' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-950'}`}>
                {admin.rol === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono tracking-widest mt-2 truncate">{admin.email}</p>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={() => setEditando(true)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition">Privilegios</button>
            {!esUsuarioActual && (
              <button onClick={() => onDelete(admin.id)} className="flex-1 border border-red-900/40 text-red-500 hover:bg-red-950/40 hover:text-red-400 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition">Revocar</button>
            )}
          </div>
        </>
      ) : (
        <div className="w-full space-y-3">
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Nivel de Acceso</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none uppercase font-bold">
              <option value="admin">Administrador (Estándar)</option>
              <option value="superadmin">Super Admin (Control Total)</option>
              <option value="cliente">Degradar a Cliente</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase py-2 rounded-lg transition">Guardar</button>
            <button onClick={() => { setEditando(false); setNombre(admin.nombre); setRol(admin.rol); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase py-2 rounded-lg transition">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// APLICACIÓN PRINCIPAL (BÓVEDA + PANEL)
// ==========================================
export default function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const guardado = localStorage.getItem('admin_session');
      return guardado ? JSON.parse(guardado) : null;
    } catch (e) { return null; }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [tabActiva, setTabActiva] = useState('resumen');
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [usuariosDb, setUsuariosDb] = useState([]);

  // Estados de Registro de Nuevo Admin
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmailPrefix, setAdminEmailPrefix] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Estados Formulario Vehículo
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('gasolina');
  const [imagen, setImagen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [stock, setStock] = useState(1);
  const [specsInput, setSpecsInput] = useState([{ clave: 'motor', valor: '' }]);

  const mostrarMensaje = (tipo, mensaje) => {
    setNotificacion({ tipo, mensaje });
    setTimeout(() => setNotificacion({ tipo: '', mensaje: '' }), 5000);
  };

  const manejarLoginSeguro = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Credenciales incorrectas.');

      const usuarioLogueado = data.usuario || data.user || data;

      const esAdminReal = usuarioLogueado.rol === 'admin' || usuarioLogueado.rol === 'superadmin' || usuarioLogueado.email.endsWith('@autopremium.com');

      if (!esAdminReal) {
        throw new Error('ACCESO DENEGADO. Nivel de autorización insuficiente.');
      }

      setAdminUser(usuarioLogueado);
      localStorage.setItem('admin_session', JSON.stringify(usuarioLogueado));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem('admin_session');
    setLoginEmail('');
    setLoginPassword('');
  };

  const cargarDatos = async () => {
    try {
      setLoadingDatos(true);
      const [resVehiculos, resUsuarios] = await Promise.all([
        fetch('http://localhost:3000/api/vehiculos').catch(() => null),
        fetch('http://localhost:3000/api/usuarios').catch(() => null) 
      ]);

      if (resVehiculos && resVehiculos.ok) setVehiculos(await resVehiculos.json());
      if (resUsuarios && resUsuarios.ok) setUsuariosDb(await resUsuarios.json());
    } catch (err) {
      mostrarMensaje('error', 'Error al conectar con la base de datos.');
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    if (adminUser) cargarDatos();
  }, [adminUser]);

  // Cálculos
  const totalStock = vehiculos.reduce((acc, auto) => acc + Number(auto.stock), 0);
  const valorInventario = vehiculos.reduce((acc, auto) => acc + (Number(auto.precio) * Number(auto.stock)), 0);
  const unidadesVendidas = usuariosDb.reduce((acc, user) => acc + Number(user.compras_totales || 0), 0);
  const ticketPromedioEstimado = vehiculos.length > 0 ? (vehiculos.reduce((acc, auto) => acc + Number(auto.precio), 0) / vehiculos.length) : 2500000;
  const gananciasTotales = unidadesVendidas * ticketPromedioEstimado;

  // ------------------------------
  // CRUD VEHÍCULOS
  // ------------------------------
  const crearVehiculo = async (e) => {
    e.preventDefault();
    const especificaciones = {};
    specsInput.forEach(s => { if (s.clave.trim()) especificaciones[s.clave.trim()] = s.valor.trim(); });
    const payload = { marca, modelo, anio: Number(anio), precio: Number(precio), categoria, imagen: imagen || 'https://images.unsplash.com/photo-1617788138017-80ad40651399', descripcion, stock: Number(stock), especificaciones };
    try {
      const response = await fetch('http://localhost:3000/api/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        mostrarMensaje('exito', '🎉 ¡Vehículo añadido!');
        setMarca(''); setModelo(''); setPrecio(''); setImagen(''); setDescripcion(''); setStock(1);
        cargarDatos();
      } else { const data = await response.json(); mostrarMensaje('error', data.error); }
    } catch (err) { mostrarMensaje('error', 'Error de red.'); }
  };

  const handleSaveVehiculo = async (id, datos) => {
    try {
      const response = await fetch(`http://localhost:3000/api/vehiculos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      if (response.ok) { mostrarMensaje('exito', '✓ Registro actualizado.'); cargarDatos(); } 
      else { const data = await response.json(); mostrarMensaje('error', data.error); }
    } catch (err) { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const eliminarVehiculo = async (id) => {
    if (!window.confirm('¿Eliminar esta unidad del inventario central?')) return;
    try {
      const response = await fetch(`http://localhost:3000/api/vehiculos/${id}`, { method: 'DELETE' });
      if (response.ok) { mostrarMensaje('exito', 'Unidad dada de baja.'); cargarDatos(); } 
      else { mostrarMensaje('error', 'No se pudo eliminar.'); }
    } catch (err) { mostrarMensaje('error', 'Error de red.'); }
  };

  // ------------------------------
  // CRUD USUARIOS (STAFF)
  // ------------------------------
  const registrarNuevoAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmailPrefix.trim()) return mostrarMensaje('error', 'Escribe un prefijo de correo válido.');

    const correoFinal = `${adminEmailPrefix.trim().toLowerCase()}@autopremium.com`;

    try {
      const response = await fetch('http://localhost:3000/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: adminNombre, email: correoFinal, password: adminPass, rol: 'admin' })
      });
      if (response.ok) {
        mostrarMensaje('exito', `⚡ Cuenta directiva para [${adminNombre}] creada exitosamente.`);
        setAdminNombre(''); setAdminEmailPrefix(''); setAdminPass('');
        cargarDatos();
      } else {
        const data = await response.json(); mostrarMensaje('error', data.error || 'No se pudo registrar la cuenta.');
      }
    } catch (err) { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const handleSaveUsuario = async (id, datos) => {
    try {
      const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (response.ok) { mostrarMensaje('exito', 'Privilegios actualizados.'); cargarDatos(); } 
      else { const data = await response.json(); mostrarMensaje('error', data.error || 'Error al actualizar privilegios.'); }
    } catch (err) { mostrarMensaje('error', 'Error de conexión.'); }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas REVOCAR EL ACCESO a este usuario permanentemente?')) return;
    try {
      const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' });
      if (response.ok) { mostrarMensaje('exito', 'Cuenta revocada exitosamente.'); cargarDatos(); } 
      else { const data = await response.json(); mostrarMensaje('error', data.error || 'Error al revocar cuenta.'); }
    } catch (err) { mostrarMensaje('error', 'Error de red.'); }
  };

  // ------------------------------
  // FILTROS INTELIGENTES 🚀
  // ------------------------------
  const vehiculosFiltrados = vehiculos.filter(car => car.marca?.toLowerCase().includes(busqueda.toLowerCase()) || car.modelo?.toLowerCase().includes(busqueda.toLowerCase()));
  const clientesFiltrados = usuariosDb.filter(u => u.rol !== 'admin' && u.rol !== 'superadmin' && !u.email?.toLowerCase().endsWith('@autopremium.com'));
  const adminsFiltrados = usuariosDb.filter(u => u.rol === 'admin' || u.rol === 'superadmin' || u.email?.toLowerCase().endsWith('@autopremium.com'));

  const agregarSpec = () => setSpecsInput([...specsInput, { clave: '', valor: '' }]);
  const cambiarSpec = (index, campo, valor) => {
    const nuevos = [...specsInput]; nuevos[index][campo] = valor; setSpecsInput(nuevos);
  };
  const eliminarSpec = (index) => setSpecsInput(specsInput.filter((_, i) => i !== index));

  // ==========================================
  // PANTALLA 1: BÓVEDA DE ACCESO
  // ==========================================
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden text-white">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900 blur-[150px] rounded-full"></div>
        </div>
        <div className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="text-center mb-8">
            <span className="text-xs bg-red-600/10 text-red-500 border border-red-900/30 font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
              Software Administrativo
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-4">Staff <span className="text-red-600">Access</span></h1>
            <p className="text-xs text-zinc-500 mt-2 tracking-widest uppercase">Sistema Privado de Gestión AutoPremium</p>
          </div>
          {loginError && (
            <div className="bg-red-950/40 border border-red-900 text-red-500 text-xs font-bold uppercase tracking-wider p-4 rounded-xl mb-6 text-center shadow-[0_0_15px_rgba(220,38,38,0.2)] animate-pulse">
              {loginError}
            </div>
          )}
          <form onSubmit={manejarLoginSeguro} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Correo Corporativo</label>
              <input required type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@autopremium.com" className="w-full bg-black border border-zinc-800 focus:border-red-600 rounded-xl p-3 text-sm text-white focus:outline-none transition shadow-inner" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Contraseña de Seguridad</label>
              <input required type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-black border border-zinc-800 focus:border-red-600 rounded-xl p-3 text-sm text-white focus:outline-none transition shadow-inner" />
            </div>
            <button type="submit" disabled={loginLoading} className={`w-full font-black text-xs uppercase tracking-widest py-4 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(220,38,38,0.4)] mt-4 ${loginLoading ? 'bg-red-800 text-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
              {loginLoading ? 'Verificando Autorización...' : 'Desbloquear Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA 2: DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased pb-20">
      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-red-600/10 text-red-500 border border-red-900/30 font-black px-2.5 py-1 rounded-md uppercase tracking-widest">Admin Control</span>
            <h1 className="text-lg font-black tracking-wider uppercase font-mono">AutoPremium</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-white uppercase">{adminUser.nombre}</p>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">ID: #{adminUser.id}</p>
            </div>
            <button onClick={logoutAdmin} className="border border-zinc-800 hover:border-red-900 hover:bg-red-950/30 hover:text-red-400 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition duration-300">
              Bloquear Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {notificacion.mensaje && (
          <div className={`mb-8 p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider text-center animate-pulse shadow-lg ${notificacion.tipo === 'exito' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-red-950/40 border-red-800 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]'}`}>
            {notificacion.mensaje}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-zinc-900 pb-4 mb-10 overflow-x-auto">
          {[
            { id: 'resumen', etiqueta: 'Resumen Financiero' }, 
            { id: 'inventario', etiqueta: 'Gestión de Inventario' },
            { id: 'clientes', etiqueta: `Clientes (${clientesFiltrados.length})` },
            { id: 'admins', etiqueta: `Staff / Directivos (${adminsFiltrados.length})` }
          ].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition duration-300 whitespace-nowrap ${tabActiva === tab.id ? 'bg-white text-black font-black shadow-xl' : 'bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'}`}>
              {tab.etiqueta}
            </button>
          ))}
        </div>

        {loadingDatos ? (
          <div className="py-20 text-center text-zinc-500 text-xs uppercase tracking-widest font-mono animate-pulse">Sincronizando Base de Datos PostgreSQL...</div>
        ) : (
          <>
            {/* PESTAÑA: RESUMEN FINANCIERO */}
            {tabActiva === 'resumen' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Desempeño Operativo</h2>
                  <p className="text-zinc-500 text-sm">Vista general de las ventas e inventario actual en tiempo real.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-900/50 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-2">Ingresos Brutos Estimados</p>
                    <p className="text-3xl font-black font-mono text-white">${gananciasTotales.toLocaleString('es-MX')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-900/50 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Unidades Entregadas</p>
                    <p className="text-3xl font-black font-mono text-white">{unidadesVendidas} <span className="text-sm font-sans font-light text-zinc-400">Autos</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-900/50 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Valor de Catálogo Físico</p>
                    <p className="text-3xl font-black font-mono text-white">${valorInventario.toLocaleString('es-MX')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900/40 to-black border border-amber-900/50 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-2">Stock General Disponible</p>
                    <p className="text-3xl font-black font-mono text-white">{totalStock} <span className="text-sm font-sans font-light text-zinc-400">Unidades</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA INVENTARIO */}
            {tabActiva === 'inventario' && (
              <div className="space-y-12 animate-fade-in">
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 lg:p-8 relative overflow-hidden">
                  <h3 className="font-black text-lg uppercase tracking-tight mb-6 border-b border-zinc-900 pb-4">Dar de Alta Nueva Unidad</h3>
                  <form onSubmit={crearVehiculo} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Marca *</label><input required type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" /></div>
                      <div><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Modelo *</label><input required type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" /></div>
                      <div><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Año *</label><input required type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none font-mono" /></div>
                      <div><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Precio MXN *</label><input required type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none font-mono" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Categoría Vehicular *</label>
                        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none uppercase font-bold text-xs">
                          <option value="gasolina">Gasolina</option>
                          <option value="hibrido">Híbrido</option>
                          <option value="electrico">Eléctrico</option>
                          <option value="superdeportivo">Superdeportivo</option>
                        </select>
                      </div>
                      <div className="md:col-span-2"><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">URL Imagen</label><input type="url" value={imagen} onChange={(e) => setImagen(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" /></div>
                    </div>
                    <div><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Descripción</label><textarea rows="3" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" /></div>
                    
                    <div className="border-t border-zinc-900 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[11px] uppercase tracking-widest text-zinc-400 font-black">Especificaciones Dinámicas</label>
                        <button type="button" onClick={agregarSpec} className="text-[10px] font-black uppercase text-blue-400 bg-blue-950/40 border border-blue-900/30 px-3 py-1.5 rounded-lg hover:text-blue-300">+ Spec</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {specsInput.map((spec, i) => (
                          <div key={i} className="flex gap-2 items-center bg-zinc-900/30 p-2 border border-zinc-900 rounded-xl">
                            <input type="text" placeholder="Clave (Ej: Motor)" value={spec.clave} onChange={(e) => cambiarSpec(i, 'clave', e.target.value)} className="w-1/2 bg-black border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none" />
                            <input type="text" placeholder="Valor (Ej: V8)" value={spec.valor} onChange={(e) => cambiarSpec(i, 'valor', e.target.value)} className="w-1/2 bg-black border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none" />
                            <button type="button" onClick={() => eliminarSpec(i)} className="text-red-500 font-bold px-2 hover:text-red-400">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest py-4 rounded-xl transition duration-300 text-xs shadow-xl">Inyectar Unidad</button>
                  </form>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                    <h3 className="font-black text-lg uppercase tracking-tight">Showroom ({vehiculosFiltrados.length})</h3>
                    <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar..." className="w-80 bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs focus:outline-none"/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehiculosFiltrados.map(car => <AdminCarCard key={car.id} auto={car} onDelete={eliminarVehiculo} onSave={handleSaveVehiculo} />)}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA CLIENTES */}
            {tabActiva === 'clientes' && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 overflow-hidden animate-fade-in">
                <h3 className="font-black text-lg uppercase tracking-tight mb-4">Base de Clientes Premium</h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest font-black">
                      <th className="py-4 px-4">ID</th><th className="py-4 px-4">Nombre</th><th className="py-4 px-4">Email</th><th className="py-4 px-4 text-center">Compras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium">
                    {clientesFiltrados.map(user => (
                      <tr key={user.id} className="hover:bg-zinc-900/20">
                        <td className="py-4 px-4 font-mono text-zinc-500">#{user.id}</td>
                        <td className="py-4 px-4 font-bold">{user.nombre}</td>
                        <td className="py-4 px-4 text-zinc-300 font-mono">{user.email}</td>
                        <td className="py-4 px-4 text-center">
                          {user.compras_totales > 0 ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-900 px-3 py-1 rounded-md">{user.compras_totales}</span>
                          ) : (
                            <span className="text-zinc-600">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {clientesFiltrados.length === 0 && (
                      <tr><td colSpan="4" className="py-8 text-center text-zinc-500 font-mono uppercase tracking-widest">No hay clientes públicos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PESTAÑA ADMINS */}
            {tabActiva === 'admins' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                
                {/* Crear Admin */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 h-fit">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-2 border-b border-zinc-900 pb-3">Registrar Nuevo Admin</h3>
                  <form onSubmit={registrarNuevoAdmin} className="space-y-4 pt-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Nombre Completo</label>
                      <input required type="text" value={adminNombre} onChange={(e) => setAdminNombre(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" />
                    </div>
                    
                    {/* INPUT DE CORREO BLOQUEADO */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Correo Corporativo</label>
                      <div className="flex">
                        <input 
                          required 
                          type="text" 
                          value={adminEmailPrefix} 
                          onChange={(e) => setAdminEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} 
                          className="w-1/2 bg-black border-y border-l border-zinc-900 rounded-l-xl p-3 text-sm focus:outline-none focus:border-zinc-700 font-mono text-right" 
                          placeholder="ej. carlos" 
                        />
                        <span className="w-1/2 bg-zinc-900 border-y border-r border-zinc-900 rounded-r-xl p-3 text-xs text-zinc-400 font-mono flex items-center overflow-hidden">
                          @autopremium.com
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Contraseña Inicial</label>
                      <input required type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-sm focus:outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition mt-2">+ Crear Cuenta</button>
                  </form>
                </div>

                {/* Lista de Admins */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 lg:col-span-2">
                  <h3 className="font-black text-lg uppercase tracking-tight mb-4">Directivos y Personal Autorizado</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {adminsFiltrados.map(admin => (
                      <AdminUserCard 
                        key={admin.id} 
                        admin={admin} 
                        onSave={handleSaveUsuario} 
                        onDelete={eliminarUsuario}
                        usuarioActualId={adminUser.id}
                      />
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}