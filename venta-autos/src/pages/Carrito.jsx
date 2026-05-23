import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Carrito({ usuario, logout, setModalAuth, actualizarConteoCarrito }) {
  const navigate = useNavigate();
  
  // 🚀 INYECCIÓN DE LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const [items, setItems] = useState([]);
  const [comprasRealizadas, setComprasRealizadas] = useState([]);
  const [tabActiva, setTabActiva] = useState('carrito'); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [showPayment, setShowPayment] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false); 
  const [receiptToPrint, setReceiptToPrint] = useState(null);

  useEffect(() => {
    if (!usuario) {
      setLoading(false);
      return;
    }

    const fetchDatos = async () => {
      try {
        setLoading(true);
        // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
        const response = await fetch(`${API_URL}/api/apartados?usuario_id=${usuario.id}`);
        if (!response.ok) throw new Error('Error al conectar con el servidor.');
        const data = await response.json();
        setItems(data);
        setSelectedIds(data.map(item => item.id));

        const historialLocal = localStorage.getItem(`compras_${usuario.id}`);
        if (historialLocal) {
          setComprasRealizadas(JSON.parse(historialLocal));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [usuario]);

  // 2. ELIMINAR APARTADO
  const eliminarApartado = async (apartadoId) => {
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados/${apartadoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar el apartado.');
      setItems(items.filter(item => item.id !== apartadoId));
      setSelectedIds(selectedIds.filter(id => id !== apartadoId));
      
      // Actualizar el "globito" rojo global de la aplicación
      if (actualizarConteoCarrito) actualizarConteoCarrito();
    } catch (err) {
      alert("Error al eliminar del carrito: " + err.message);
    }
  };

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((acc, curr) => acc + Number(curr.precio), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // 3. PROCESAR PAGO Y MOVER A "COMPRAS REALIZADAS"
  const procesarPago = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    const mostExpensive = [...selectedItems].sort((a, b) => Number(b.precio) - Number(a.precio))[0];
    const mainCategory = mostExpensive?.categoria || 'gasolina';

    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id, apartados_ids: selectedIds })
      });

      if (!response.ok) throw new Error('Fallo en el servidor al registrar el pago.');

      // Generar la Factura
      const nuevaCompra = {
        idTransaccion: 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
        cliente: usuario?.nombre || 'Cliente Premium CDMX',
        items: selectedItems,
        subtotal, iva, total,
        tema: mainCategory
      };

      // Guardar en el historial
      const nuevoHistorial = [nuevaCompra, ...comprasRealizadas];
      setComprasRealizadas(nuevoHistorial);
      localStorage.setItem(`compras_${usuario.id}`, JSON.stringify(nuevoHistorial));

      // Limpiar carrito actual
      setItems(items.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      setShowPayment(false);
      
      // Actualizar el contador global de la aplicación
      if (actualizarConteoCarrito) actualizarConteoCarrito();
      
      // Mostrar la factura recién creada y cambiar de pestaña
      setReceiptToPrint(nuevaCompra);
      setTabActiva('compras');

    } catch (err) {
      alert("Error al procesar la transacción: " + err.message);
    }
  };

  // Función para abrir el PDF
  const imprimirPDF = (compra) => {
    setReceiptToPrint(compra);
    setTimeout(() => window.print(), 200); 
  };

  // Tema de la factura
  const getReceiptTheme = (tema) => {
    switch (tema) {
      case 'superdeportivo': return { border: 'border-red-600', text: 'text-red-600', bg: 'bg-red-50/60' };
      case 'electrico': return { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50/60' };
      case 'hibrido': return { border: 'border-cyan-500', text: 'text-cyan-600', bg: 'bg-cyan-50/60' };
      default: return { border: 'border-zinc-800', text: 'text-black', bg: 'bg-zinc-50' };
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 pb-24">
      
      <div className="print:hidden">
        {/* ==========================================
            NAVBAR UNIFICADO
            ========================================== */}
        <nav className="fixed top-0 left-0 w-full z-40 transition-all duration-700 border-b px-6 md:px-8 py-4 flex justify-between items-center bg-black/80 backdrop-blur-xl border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <span className="text-xl font-black text-white tracking-widest cursor-pointer z-50" onClick={() => navigate('/')}>
            AUTOPREMIUM <span className="text-xs font-bold text-zinc-500">CDMX</span>
          </span>

          <button 
            className="md:hidden text-white text-2xl z-50 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* MENÚ ESCRITORIO */}
          <div className="hidden md:flex gap-6 items-center text-sm font-bold tracking-wider uppercase">
            <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white transition-colors duration-500">Inicio</button>
            <button onClick={() => navigate('/catalogo')} className="text-zinc-400 hover:text-white transition-colors duration-500">Catálogo</button>
            
            <button onClick={() => setShowMapModal(true)} className="text-zinc-400 hover:text-white transition-colors duration-500">Dónde Encontrarnos</button>
            
            <div className="relative">
              <button 
                onClick={() => navigate('/carrito')}
                className="text-zinc-400 hover:text-white transition-colors duration-500 flex items-center gap-2"
              >
                Carrito 
                {usuario && items.length > 0 && (
                  <span className="text-white text-[10px] px-2 py-0.5 rounded-full bg-zinc-700">
                    {items.length}
                  </span>
                )}
              </button>
            </div>

            {usuario ? (
              <div className="flex items-center gap-4 pl-4 border-l border-zinc-800/50">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] opacity-50 leading-none text-white">Conectado</span>
                  <span className="text-xs font-bold tracking-wider text-white">{usuario.nombre || 'Usuario'}</span>
                </div>
                <button 
                  onClick={logout} 
                  className="border border-zinc-800 text-zinc-400 px-3 py-2 rounded text-xs hover:bg-red-900/50 hover:text-red-400 hover:border-red-900 transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button onClick={() => setModalAuth({ abierto: true, modoRegistro: false })} className="px-5 py-2 rounded transition-colors duration-500 shadow-lg bg-zinc-200 text-black hover:bg-white">
                Iniciar Sesión
              </button>
            )}
          </div>

          {/* MENÚ MÓVIL (Celulares) */}
          <div className={`absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-zinc-800 flex flex-col gap-4 p-6 transition-all duration-300 md:hidden overflow-hidden ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 py-0 border-transparent'}`}>
            <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="text-white text-left font-bold tracking-widest uppercase text-sm py-2">Inicio</button>
            <button onClick={() => { navigate('/catalogo'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">Catálogo</button>
            
            <button onClick={() => { setShowMapModal(true); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">Dónde Encontrarnos</button>
            
            <button onClick={() => { navigate('/carrito'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2 flex items-center gap-2">
              Carrito
              {usuario && items.length > 0 && (
                <span className="bg-zinc-700 text-white text-[10px] px-2 py-0.5 rounded-full">{items.length}</span>
              )}
            </button>

            <div className="h-px w-full bg-zinc-800 my-2"></div>

            {usuario ? (
               <div className="flex justify-between items-center">
                 <span className="text-white text-sm font-bold">👤 {usuario.nombre}</span>
                 <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="bg-zinc-900 text-red-500 px-4 py-2 rounded text-xs font-bold">Cerrar Sesión</button>
               </div>
            ) : (
              <button onClick={() => { setModalAuth({ abierto: true, modoRegistro: false }); setMobileMenuOpen(false); }} className="bg-blue-600 text-white w-full py-3 rounded font-bold uppercase tracking-widest text-xs">
                Iniciar Sesión
              </button>
            )}
          </div>
        </nav>

        <div className="pt-32 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="mb-8">
            <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-500 block mb-1">Tu perfil financiero</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase">PANEL <span className="text-zinc-500">CLIENTE</span></h1>
            <div className="w-16 h-1 bg-zinc-700 mt-4 rounded-full"></div>
          </div>

          {!usuario ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-16 text-center shadow-2xl">
              <span className="text-6xl block mb-6 opacity-50">🔒</span>
              <h2 className="text-2xl font-bold mb-4">Acceso Restringido</h2>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto">Para ver o pagar tus reservas, primero debes iniciar sesión.</p>
              <button onClick={() => setModalAuth({ abierto: true, modoRegistro: false })} className="bg-white text-black font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-zinc-200 transition">Iniciar Sesión</button>
            </div>
          ) : loading ? (
            <div className="flex flex-col justify-center items-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-500 text-xs tracking-widest uppercase font-bold">Consultando base de datos...</p>
            </div>
          ) : (
            <>
              {/* TABS DE NAVEGACIÓN */}
              <div className="flex gap-4 mb-8 border-b border-zinc-900 pb-4 overflow-x-auto">
                <button 
                  onClick={() => setTabActiva('carrito')} 
                  className={`px-6 py-3 font-bold tracking-widest uppercase rounded-lg transition-colors whitespace-nowrap ${tabActiva === 'carrito' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  🛒 En Carrito ({items.length})
                </button>
                <button 
                  onClick={() => setTabActiva('compras')} 
                  className={`px-6 py-3 font-bold tracking-widest uppercase rounded-lg transition-colors whitespace-nowrap ${tabActiva === 'compras' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'text-zinc-500 hover:text-white'}`}
                >
                  ✅ Compras Realizadas ({comprasRealizadas.length})
                </button>
              </div>

              {/* PESTAÑA: CARRITO */}
              {tabActiva === 'carrito' && (
                items.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-16 text-center shadow-2xl mt-10">
                    <span className="text-6xl block mb-6 opacity-50">🏎️</span>
                    <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
                    <p className="text-zinc-400 mb-8 max-w-md mx-auto">No tienes vehículos pendientes de pago. Visita el catálogo para apartar.</p>
                    <button onClick={() => navigate('/catalogo')} className="bg-white text-black font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-zinc-200 transition">Ir al Catálogo</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-900 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Seleccionados para Liquidar ({selectedItems.length})</span>
                        <button onClick={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i=>i.id))} className="text-xs text-blue-400 hover:text-blue-300 transition">
                          {selectedIds.length === items.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                      </div>

                      {items.map(item => (
                        <div key={item.id} className={`flex flex-col md:flex-row bg-zinc-950 border rounded-2xl overflow-hidden transition-all duration-300 ${selectedIds.includes(item.id) ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'border-zinc-900 opacity-50'}`}>
                          <div className="flex items-center p-4 md:w-1/3 bg-black/40">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} className="w-5 h-5 accent-blue-600 mr-4 cursor-pointer" />
                            <div className="w-full h-24 rounded-lg overflow-hidden relative">
                              <img src={item.imagen} alt={item.modelo} className="w-full h-full object-cover"/>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col justify-between">
                            <div className="flex flex-col md:flex-row md:justify-between items-start gap-3">
                              <div>
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-1">{item.categoria}</span>
                                <h3 className="text-xl font-bold">{item.marca} <span className="font-light">{item.modelo}</span></h3>
                              </div>
                              <button onClick={() => eliminarApartado(item.id)} className="text-xs text-red-500 hover:text-red-400 transition duration-300 uppercase tracking-wider font-bold">
                                Eliminar del carrito
                              </button>
                            </div>
                            <div className="text-right mt-4 md:mt-0">
                              <span className="text-[10px] uppercase text-zinc-500 tracking-widest block mb-1">Precio Unitario</span>
                              <span className="text-xl font-mono font-bold">${Number(item.precio).toLocaleString('es-MX')} <span className="text-xs">MXN</span></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Panel Financiero */}
                    <div className="lg:col-span-1">
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 sticky top-28 shadow-2xl">
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-zinc-900 pb-4">Detalles de la Compra</h3>
                        <div className="space-y-4 mb-8 text-sm">
                          <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span className="font-mono text-white">${subtotal.toLocaleString('es-MX')}</span></div>
                          <div className="flex justify-between text-zinc-400"><span>IVA (16%)</span><span className="font-mono text-white">${iva.toLocaleString('es-MX')}</span></div>
                          <div className="flex justify-between text-zinc-400"><span>Traslado</span><span className="font-mono text-emerald-400 font-bold uppercase text-[10px]">Sin costo</span></div>
                        </div>
                        <div className="border-t border-zinc-900 pt-6 mb-8">
                          <div className="flex justify-between items-end">
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total Final</span>
                            <span className="text-3xl font-mono font-black text-white">${total.toLocaleString('es-MX')}</span>
                          </div>
                        </div>
                        <button disabled={selectedItems.length === 0} onClick={() => setShowPayment(true)} className={`w-full py-4 rounded font-black uppercase tracking-widest transition-all ${selectedItems.length > 0 ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}>
                          Liquidar Selección
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* PESTAÑA: COMPRAS REALIZADAS */}
              {tabActiva === 'compras' && (
                comprasRealizadas.length === 0 ? (
                  <div className="text-center py-24 bg-zinc-950 border border-zinc-900 rounded-2xl">
                    <span className="text-5xl opacity-50 block mb-4">🧾</span>
                    <h3 className="text-xl font-bold mb-2">Aún no tienes compras</h3>
                    <p className="text-zinc-500">Aquí aparecerán tus facturas cuando liquides un vehículo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {comprasRealizadas.map((compra, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-emerald-900/30 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-4">
                            <div>
                              <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-black">Pagado y Liquidado</span>
                              <h4 className="font-bold text-white text-lg mt-1">{compra.idTransaccion}</h4>
                            </div>
                            <span className="text-xs text-zinc-500">{compra.fecha.split(',')[0]}</span>
                          </div>
                          <ul className="mb-6 space-y-2">
                            {compra.items.map((item, i) => (
                              <li key={i} className="text-sm text-zinc-300 flex justify-between">
                                <span>{item.marca} {item.modelo}</span>
                                <span className="font-mono text-zinc-500">${Number(item.precio).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                          <div>
                            <span className="text-[10px] uppercase text-zinc-500 block">Total</span>
                            <span className="font-mono font-bold text-xl">${compra.total.toLocaleString()}</span>
                          </div>
                          <button onClick={() => imprimirPDF(compra)} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/50 px-4 py-2 rounded text-xs uppercase tracking-widest font-bold transition">
                            Ver PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* ==========================================
            MODAL DE PAGO
            ========================================== */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="bg-zinc-900 p-6 flex justify-between items-center border-b border-zinc-800">
                <h3 className="font-bold uppercase tracking-widest">Portal Seguro de Pago</h3>
                <button onClick={() => setShowPayment(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={procesarPago} className="p-8 space-y-5">
                <div className="bg-blue-950/20 border border-blue-900/30 p-4 rounded-lg flex items-start gap-3">
                  <span className="text-blue-400 text-lg">🛡️</span>
                  <p className="text-[10px] text-blue-200 leading-relaxed uppercase tracking-wider font-semibold">
                    Simulación de pasarela. Los datos ingresados no se validan con bancos reales.
                  </p>
                </div>
                
                {/* Nombre */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Nombre del Titular</label>
                  <input required type="text" placeholder="Ej. Hugo Becerra" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"/>
                </div>
                
                {/* Tarjeta */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Número de Tarjeta</label>
                  <input required type="text" placeholder="4152 3162 0000 0000" maxLength="19" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-blue-500"/>
                </div>
                
                {/* Caducidad y CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Fecha de Caducidad</label>
                    <input required type="text" placeholder="MM/AA" maxLength="5" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Código CVC</label>
                    <input required type="password" placeholder="***" maxLength="4" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-blue-500"/>
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-4 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] mt-2">
                  Confirmar Pago (${total.toLocaleString('es-MX')})
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL DISCRETO DEL MAPA (UBICACIÓN)
            ========================================== */}
        {showMapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
              <div className="bg-zinc-900 p-4 flex justify-between items-center border-b border-zinc-800">
                <div>
                  <h3 className="font-bold uppercase tracking-widest text-sm text-white">Nuestra Ubicación</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Av. Telecomunicaciones, CDMX</p>
                </div>
                <button onClick={() => setShowMapModal(false)} className="text-zinc-500 hover:text-white text-2xl leading-none">
                  ✕
                </button>
              </div>
              
              {/* Contenedor del Mapa embebido */}
              <div className="p-2 h-72 md:h-96">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.633785217436!2d-99.06013322479261!3d19.38499268188435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1fd0604dd11e1%3A0x6bbaecdb71597a7a!2sAv.%20Telecomunicaciones%2C%20Leyes%20de%20Reforma%202da%20Secc%2C%20Iztapalapa%2C%2009310%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses-419!2smx!4v1716353982468!5m2!1ses-419!2smx"
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '0.5rem' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación AutoPremium CDMX"
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VISTA EXCLUSIVA DE IMPRESIÓN (PDF DINÁMICO) */}
      {receiptToPrint && (
        <div className={`hidden print:block min-h-screen p-10 font-sans ${getReceiptTheme(receiptToPrint.tema).bg}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className={`border-b-4 pb-6 mb-8 flex justify-between items-end ${getReceiptTheme(receiptToPrint.tema).border}`}>
            <div>
              <h1 className={`text-3xl font-black tracking-widest uppercase ${getReceiptTheme(receiptToPrint.tema).text}`}>
                AUTOPREMIUM <span className="text-black text-xs font-bold">CDMX</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1 uppercase">Factura de Adquisición Digital</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">Folio: <span className="font-mono">{receiptToPrint.idTransaccion}</span></p>
              <p className="text-xs text-gray-500">{receiptToPrint.fecha}</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Cliente Adquirente</h3>
            <p className="text-lg font-extrabold text-gray-900">{receiptToPrint.cliente}</p>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 border-b border-gray-200 pb-1">Unidades Liquidadas</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-300">
                  <th className="py-3">Descripción</th>
                  <th className="py-3">Categoría de Ingeniería</th>
                  <th className="py-3 text-right">Importe Comercial</th>
                </tr>
              </thead>
              <tbody>
                {receiptToPrint.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-4 font-bold text-gray-800">{item.marca} <span className="font-light">{item.modelo}</span></td>
                    <td className="py-4 text-xs uppercase text-gray-500 font-medium">{item.categoria}</td>
                    <td className="py-4 text-right font-mono font-bold text-gray-900">${Number(item.precio).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-1/2 ml-auto space-y-2">
            <div className="flex justify-between py-1 text-xs text-gray-600">
              <span>Subtotal</span><span className="font-mono">${receiptToPrint.subtotal.toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between py-1 text-xs text-gray-600 border-b border-gray-300">
              <span>I.V.A. Trasladado (16%)</span><span className="font-mono">${receiptToPrint.iva.toLocaleString('es-MX')}</span>
            </div>
            <div className={`flex justify-between py-3 text-xl font-black ${getReceiptTheme(receiptToPrint.tema).text}`}>
              <span>TOTAL</span><span className="font-mono">${receiptToPrint.total.toLocaleString('es-MX')} MXN</span>
            </div>
          </div>
          <div className="mt-20 text-center border-t border-gray-300 pt-8">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Este comprobante certifica la adjudicación del activo.</p>
            <p className="text-[8px] text-gray-400 font-mono">AutoPremium CDMX Showroom | Av. Telecomunicaciones, CDMX.</p>
          </div>
        </div>
      )}
    </div>
  );
}