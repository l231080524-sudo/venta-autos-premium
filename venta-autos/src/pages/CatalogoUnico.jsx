import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CarCard from '../components/CarCard'; 

export default function CatalogoUnico({ setModalAuth, usuario, carritoCount = 0, logout, agregarAlCarrito }) {
  const navigate = useNavigate();
  
  // 🚀 INYECCIÓN DE LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 

  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [precioMaximo, setPrecioMaximo] = useState(10000000);
  
  const [navTheme, setNavTheme] = useState('obsidian');

  // Referencias para el scroll
  const gasolinaRef = useRef(null);
  const hibridoRef = useRef(null);
  const electricoRef = useRef(null);
  const superdeportivosRef = useRef(null);
  const mapaRef = useRef(null); 

  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/vehiculos`);
        if (!response.ok) throw new Error('No se pudo establecer conexión con el backend.');
        const data = await response.json();
        setVehiculos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehiculos();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const getRectTop = (ref) => ref.current ? ref.current.getBoundingClientRect().top : 9999;
      
      const gasolinaTop = getRectTop(gasolinaRef);
      const hibridoTop = getRectTop(hibridoRef);
      const electricoTop = getRectTop(electricoRef);
      const superdeportivosTop = getRectTop(superdeportivosRef);

      const offset = window.innerHeight * 0.4;

      if (superdeportivosTop <= offset) setNavTheme('red');
      else if (electricoTop <= offset) setNavTheme('neon');
      else if (hibridoTop <= offset) setNavTheme('teal');
      else setNavTheme('obsidian');
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categoriaFiltro]);

  const getVehiculosDeCategoria = (cat) => {
    return vehiculos
      .filter(car => car.categoria === cat)
      .filter(car => Number(car.precio) <= precioMaximo)
      .sort((a, b) => Number(a.precio) - Number(b.precio));
  };

  const getNavbarStyles = () => {
    switch (navTheme) {
      case 'teal': return 'bg-[#050f14]/90 backdrop-blur-xl border-cyan-900/50 shadow-[0_4px_30px_rgba(6,182,212,0.1)]';
      case 'neon': return 'bg-black/90 backdrop-blur-xl border-emerald-900/40 shadow-[0_4px_30px_rgba(0,255,204,0.05)]';
      case 'red': return 'bg-black/90 backdrop-blur-xl border-red-900/50 shadow-[0_4px_30px_rgba(220,38,38,0.1)]';
      default: return 'bg-black/80 backdrop-blur-xl border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]';
    }
  };

  const getNavbarButtonClass = () => {
    switch (navTheme) {
      case 'teal': return 'text-cyan-600 hover:text-cyan-300';
      case 'neon': return 'text-emerald-600 hover:text-[#00ffcc]';
      case 'red': return 'text-red-700 hover:text-red-500';
      default: return 'text-zinc-400 hover:text-white';
    }
  };

  const getLoginButtonClass = () => {
    switch (navTheme) {
      case 'teal': return 'bg-cyan-600 text-white hover:bg-cyan-500';
      case 'neon': return 'bg-[#00ffcc] text-black hover:bg-white font-bold';
      case 'red': return 'bg-red-600 text-white hover:bg-red-700';
      default: return 'bg-zinc-200 text-black hover:bg-white';
    }
  };

  const scrollToMap = () => {
    setMobileMenuOpen(false); 
    if (mapaRef.current) {
      mapaRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black transition-colors duration-700 text-white flex flex-col relative">
      
      {/* 🚀 NAV CORREGIDO DEFINITIVAMENTE: sticky en lugar de fixed y z-[9999] */}
      <nav className={`sticky top-0 w-full border-b z-[9999] transition-all duration-700 px-6 md:px-8 py-4 flex justify-between items-center ${getNavbarStyles()}`}>
        
        <span className="text-xl font-black tracking-widest cursor-pointer relative z-[10000]" onClick={() => navigate('/')}>
          AUTOPREMIUM <span className={`text-xs font-bold ${navTheme === 'red' ? 'text-red-600' : navTheme === 'neon' ? 'text-[#00ffcc]' : navTheme === 'teal' ? 'text-cyan-500' : 'text-zinc-500'}`}>CDMX</span>
        </span>

        {/* 🚀 BOTÓN HAMBURGUESA: Prioridad absoluta para que reciba los clics */}
        <button 
          className="md:hidden text-white text-3xl relative z-[10000] focus:outline-none p-1 cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* =========================================================
            MENÚ ESCRITORIO
            ========================================================= */}
        <div className="hidden md:flex gap-6 items-center text-sm font-bold tracking-wider uppercase relative z-[10000]">
          
          <button onClick={() => navigate('/')} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Inicio
          </button>
          
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Catálogo
          </button>

          <button onClick={scrollToMap} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Dónde Encontrarnos
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowCartPreview(!showCartPreview)} 
              className={`${getNavbarButtonClass()} transition-colors duration-500 flex items-center gap-2`}
            >
              Carrito 
              {usuario && carritoCount > 0 && (
                <span className={`text-white text-[10px] px-2 py-0.5 rounded-full ${navTheme === 'obsidian' ? 'bg-zinc-700' : navTheme === 'teal' ? 'bg-cyan-600' : navTheme === 'neon' ? 'bg-[#00ffcc] text-black' : 'bg-red-600'}`}>
                  {carritoCount}
                </span>
              )}
            </button>
            
            {showCartPreview && (
              <div className="absolute top-full right-0 mt-6 w-72 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <h4 className="font-bold tracking-widest text-white">TU CARRITO</h4>
                  <button onClick={() => setShowCartPreview(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
                </div>
                {usuario ? (
                  <>
                    <p className="text-zinc-400 text-sm font-normal">
                      Tienes <span className="text-white font-bold">{carritoCount} artículo{carritoCount !== 1 ? 's' : ''}</span> apartados.
                    </p>
                    <button 
                      onClick={() => { setShowCartPreview(false); navigate('/carrito'); }} 
                      className="bg-zinc-200 hover:bg-white text-black w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Ir a Detalles
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-zinc-400 text-sm font-normal">Inicia sesión para poder ver tus vehículos.</p>
                    <button 
                      onClick={() => { setShowCartPreview(false); setModalAuth({ abierto: true, modoRegistro: false }); }} 
                      className="bg-zinc-200 hover:bg-white text-black w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Iniciar Sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {usuario ? (
            <div className="flex items-center gap-4 pl-4 border-l border-zinc-800/50">
              <div className="flex flex-col text-right">
                <span className="text-[10px] opacity-50 leading-none text-white">Conectado</span>
                <span className="text-xs font-bold tracking-wider text-white">{usuario.nombre || 'Usuario'}</span>
              </div>
              <button onClick={logout} className="border border-zinc-800 text-zinc-400 px-3 py-2 rounded text-xs hover:bg-red-900/50 hover:text-red-400 hover:border-red-900 transition-colors">
                Salir
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setModalAuth({ abierto: true, modoRegistro: false })} 
              className={`px-5 py-2 rounded transition-colors duration-500 shadow-lg ${getLoginButtonClass()}`}
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* =========================================================
            MENÚ MÓVIL
            ========================================================= */}
        <div className={`absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-zinc-800 flex flex-col transition-all duration-300 md:hidden overflow-hidden shadow-2xl z-[990] ${mobileMenuOpen ? 'max-h-[500px] opacity-100 p-6 gap-4' : 'max-h-0 opacity-0 p-0 gap-0 border-transparent'}`}>
          
          <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Inicio
          </button>
          
          <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Catálogo
          </button>

          <button onClick={scrollToMap} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Dónde Encontrarnos
          </button>

          <button onClick={() => { navigate('/carrito'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2 flex items-center gap-2">
            Ver Carrito {usuario && carritoCount > 0 && (<span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{carritoCount}</span>)}
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

      {/* CABECERA CATÁLOGO */}
      <header className="relative h-[45vh] flex flex-col justify-center items-center text-center px-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black overflow-hidden pt-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center opacity-10 mix-blend-screen pointer-events-none"></div>
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-3">Inventario Exclusivo CDMX</p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-widest text-white drop-shadow-xl">
          SHOWROOM <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">DIGITAL</span>
        </h1>
        <div className="w-16 h-1 bg-zinc-600 mt-5 rounded-full opacity-50"></div>
      </header>

      {/* FILTROS */}
      <section className="sticky top-[70px] md:top-20 z-40 max-w-[1400px] mx-auto px-4 md:px-8 mb-8">
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800/50 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap justify-center gap-2 w-full xl:w-auto">
            {['todos', 'gasolina', 'hibrido', 'electrico', 'superdeportivo'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-4 py-3 md:py-2 text-[10px] md:text-xs uppercase tracking-widest font-bold rounded-lg transition-all duration-300 flex-1 lg:flex-none text-center border ${
                  categoriaFiltro === cat 
                    ? 'bg-zinc-200 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-full xl:w-96 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] md:text-xs uppercase text-zinc-500 tracking-widest font-bold">Límite Financiero</span>
              <span className="text-xs md:text-sm font-mono font-bold text-zinc-300">
                ${precioMaximo.toLocaleString('es-MX')} MXN
              </span>
            </div>
            <input 
              type="range" min="1000000" max="10000000" step="250000"
              value={precioMaximo} 
              onChange={(e) => setPrecioMaximo(Number(e.target.value))}
              className="w-full accent-zinc-400 bg-zinc-900 rounded-lg appearance-none h-2 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL: CATÁLOGO */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-xs tracking-widest uppercase font-bold">Sincronizando inventario...</p>
          </div>
        ) : error ? (
          <div className="text-center py-24 px-6 mx-auto">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-lg font-bold text-red-400 mt-4 mb-2">Error de Sincronización</h3>
            <p className="text-sm text-zinc-500 mb-6">No se puede contactar al servidor Postgres local.</p>
          </div>
        ) : (
          <div className="w-full space-y-0">

            {/* GASOLINA */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'gasolina') && (
              <section ref={gasolinaRef} className="py-24 px-6 md:px-12 bg-gradient-to-b from-black via-zinc-950 to-[#0a0a0a] text-white transition-colors duration-700">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-widest text-zinc-500">Clásicos de Combustión</span>
                    <h2 className="text-5xl font-serif font-black mt-2 text-zinc-100">Colección Gasolina</h2>
                    <div className="w-20 h-1 bg-zinc-700 mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('gasolina').length === 0 ? (
                    <p className="text-zinc-600 italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('gasolina').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="gasolina" />
                          {car.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl cursor-not-allowed">
                              <span className="text-5xl mb-4 opacity-80">🚫</span>
                              <span className="text-red-500 font-black text-xl uppercase tracking-widest border-2 border-red-500/50 px-6 py-2 rounded-xl bg-red-950/80 shadow-[0_0_20px_rgba(220,38,38,0.5)]">Sin Stock</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* HÍBRIDO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'hibrido') && (
              <section ref={hibridoRef} className="py-24 px-6 md:px-12 bg-gradient-to-b from-[#0a0a0a] to-[#040e12] border-t border-cyan-900/30 transition-colors duration-700">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-widest text-cyan-700">Doble Propulsión Inteligente</span>
                    <h2 className="text-5xl font-sans font-black mt-2 text-cyan-50">Colección Híbridos</h2>
                    <div className="w-20 h-1 bg-cyan-800 mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('hibrido').length === 0 ? (
                    <p className="text-zinc-600 italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('hibrido').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="hibrido" />
                          {car.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl cursor-not-allowed">
                              <span className="text-5xl mb-4 opacity-80">🚫</span>
                              <span className="text-cyan-500 font-black text-xl uppercase tracking-widest border-2 border-cyan-500/50 px-6 py-2 rounded-xl bg-cyan-950/80 shadow-[0_0_20px_rgba(6,182,212,0.5)]">Sin Stock</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ELÉCTRICO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'electrico') && (
              <section ref={electricoRef} className="py-24 px-6 md:px-12 bg-gradient-to-b from-[#040e12] to-black border-t border-emerald-950/40 transition-colors duration-700">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-widest text-emerald-700">Emisiones Cero</span>
                    <h2 className="text-5xl font-mono font-black mt-2 text-emerald-50">Colección Eléctricos</h2>
                    <div className="w-20 h-1 bg-emerald-800 mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('electrico').length === 0 ? (
                    <p className="text-zinc-600 italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('electrico').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="electrico" />
                          {car.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl cursor-not-allowed">
                              <span className="text-5xl mb-4 opacity-80">🚫</span>
                              <span className="text-emerald-500 font-black text-xl uppercase tracking-widest border-2 border-emerald-500/50 px-6 py-2 rounded-xl bg-emerald-950/80 shadow-[0_0_20px_rgba(16,185,129,0.5)]">Sin Stock</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SUPERDEPORTIVO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'superdeportivo') && (
              <section ref={superdeportivosRef} className="py-24 px-6 md:px-12 bg-black border-t border-red-950 transition-colors duration-700 shadow-[inset_0_50px_100px_rgba(220,38,38,0.02)]">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-widest text-red-800 italic">Desempeño Extremo de Pista</span>
                    <h2 className="text-5xl font-extrabold uppercase mt-2 tracking-tight text-white">Superdeportivos</h2>
                    <div className="w-20 h-1 bg-red-800 mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('superdeportivo').length === 0 ? (
                    <p className="text-zinc-600 italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('superdeportivo').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="superdeportivo" />
                          {car.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl cursor-not-allowed">
                              <span className="text-5xl mb-4 opacity-80">🚫</span>
                              <span className="text-red-500 font-black text-xl uppercase tracking-widest border-2 border-red-500/50 px-6 py-2 rounded-xl bg-red-950/80 shadow-[0_0_20px_rgba(220,38,38,0.5)]">Sin Stock</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* ==========================================
          SECCIÓN DE MAPA (Dónde Encontrarnos)
          ========================================== */}
      <section ref={mapaRef} className="py-24 px-8 md:px-24 bg-[#050505] border-t border-zinc-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">Visita Nuestro Showroom</h2>
              <p className="text-blue-500 font-bold uppercase tracking-widest text-xs">Agenda tu cita para personalización</p>
            </div>

            <div className="bg-zinc-900/50 p-6 md:p-8 rounded-2xl border border-zinc-800 space-y-6">
              <div>
                <h3 className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><span>📍</span> Ubicación</h3>
                <p className="text-lg text-zinc-200">Av Telecomunicaciones, Chinam Pac de Juárez,<br/> Iztapalapa, 09208 Ciudad de México, CDMX</p>
              </div>

              <div className="h-px w-full bg-zinc-800"></div>

              <div>
                <h3 className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><span>🕒</span> Horarios de Atención</h3>
                <ul className="space-y-3 text-zinc-300">
                  <li className="flex justify-between items-center">
                    <span>Lunes a Viernes</span> 
                    <span className="font-mono bg-black px-3 py-1 rounded text-sm">09:00 - 20:00</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Sábados</span> 
                    <span className="font-mono bg-black px-3 py-1 rounded text-sm">10:00 - 18:00</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Domingos</span> 
                    <span className="font-mono bg-black px-3 py-1 rounded text-sm">10:00 - 15:00</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-[300px] md:h-[450px] w-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative">
            <iframe 
              title="Ubicación AutoPremium CDMX"
              className="w-full h-full border-0 filter grayscale hover:grayscale-0 transition-all duration-700"
              src="https://maps.google.com/maps?q=Av%20Telecomunicaciones,%20Chinam%20Pac%20de%20Juárez,%20Iztapalapa,%2009208%20Ciudad%20de%20México&t=&z=15&ie=UTF8&iwloc=&output=embed" 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

    </div>
  );
}