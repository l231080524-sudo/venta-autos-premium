import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ setModalAuth, usuario, carritoCount = 0, logout }) {
  const navigate = useNavigate();
  
  // 1. AQUÍ AGREGAMOS LA VARIABLE DE ENTORNO
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [showCartPreview, setShowCartPreview] = useState(false);
  const [navTheme, setNavTheme] = useState('obsidian'); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 

  const [localCarritoCount, setLocalCarritoCount] = useState(carritoCount);

  const superdeportivosRef = useRef(null); 
  const mapaRef = useRef(null); 

  useEffect(() => {
    if (usuario) {
      // 2. CAMBIAMOS EL FETCH PARA USAR API_URL
      fetch(`${API_URL}/api/apartados?usuario_id=${usuario.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setLocalCarritoCount(data.length);
          }
        })
        .catch(err => console.error("Error al actualizar contador:", err));
    } else {
      setLocalCarritoCount(0);
    }
  }, [usuario]);

  useEffect(() => {
    const handleScroll = () => {
      if (superdeportivosRef.current) {
        const rect = superdeportivosRef.current.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.3 && rect.bottom >= 0) {
          setNavTheme('red');
        } else {
          setNavTheme('obsidian');
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isRed = navTheme === 'red';

  // Manejo inteligente del click en "Inicio"
  const handleInicioClick = () => {
    setMobileMenuOpen(false);
    if (window.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  // Manejo inteligente del click en "Dónde Encontrarnos"
  const handleMapaClick = () => {
    setMobileMenuOpen(false); 
    if (window.location.pathname === '/') {
      if (mapaRef.current) {
        mapaRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      // Pequeño delay para dar tiempo a que cargue el Home antes de escrolear
      setTimeout(() => {
        const el = document.getElementById('mapa-showroom');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Estilos dinámicos del Navbar
  const getNavbarStyles = () => {
    if (isRed) {
      return 'bg-black/90 backdrop-blur-xl border-red-900/50 shadow-[0_4px_30px_rgba(220,38,38,0.1)]';
    }
    return 'bg-black/80 backdrop-blur-xl border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]';
  };

  const getNavbarButtonClass = () => {
    if (isRed) {
      return 'text-red-700 hover:text-red-500';
    }
    return 'text-zinc-400 hover:text-white';
  };

  const getLoginButtonClass = () => {
    if (isRed) {
      return 'bg-red-600 text-white hover:bg-red-700';
    }
    return 'bg-zinc-200 text-black hover:bg-white';
  };

  return (
    <div className="w-full relative">
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 border-b px-6 md:px-8 py-4 flex justify-between items-center ${getNavbarStyles()}`}>
        
        {/* LOGO */}
        <span className="text-xl font-black text-white tracking-widest cursor-pointer z-50" onClick={handleInicioClick}>
          AUTOPREMIUM <span className={`text-xs font-bold ${isRed ? 'text-red-600' : 'text-zinc-500'}`}>CDMX</span>
        </span>

        <button 
          className="md:hidden text-white text-2xl z-50 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* =========================================================
            MENÚ ESCRITORIO (Ordenado con los 4 enlaces principales)
            ========================================================= */}
        <div className="hidden md:flex gap-6 items-center text-sm font-bold tracking-wider uppercase">
          
          <button onClick={handleInicioClick} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Inicio
          </button>

          <button onClick={() => navigate('/catalogo')} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Catálogo
          </button>
          
          <button onClick={handleMapaClick} className={`${getNavbarButtonClass()} transition-colors duration-500`}>
            Dónde Encontrarnos
          </button>
          
          {/* BOTÓN CARRITO CON DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => setShowCartPreview(!showCartPreview)} 
              className={`${getNavbarButtonClass()} transition-colors duration-500 flex items-center gap-2`}
            >
              Carrito 
              {usuario && localCarritoCount > 0 && (
                <span className={`text-white text-[10px] px-2 py-0.5 rounded-full ${isRed ? 'bg-red-600' : 'bg-zinc-700'}`}>
                  {localCarritoCount}
                </span>
              )}
            </button>
            
            {showCartPreview && (
              <div className="absolute top-full right-0 mt-6 w-72 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 z-50 shadow-2xl">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <h4 className="font-bold tracking-widest text-white">TU CARRITO</h4>
                  <button onClick={() => setShowCartPreview(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
                </div>
                {usuario ? (
                  <>
                    <p className="text-zinc-400 text-sm font-normal">
                      Tienes <span className="text-white font-bold">{localCarritoCount} artículo{localCarritoCount !== 1 ? 's' : ''}</span> apartados.
                    </p>
                    <button 
                      onClick={() => { setShowCartPreview(false); navigate('/carrito'); }} 
                      className={`w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all ${isRed ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-zinc-200 hover:bg-white text-black'}`}
                    >
                      Ir a Detalles
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-zinc-400 text-sm font-normal">Inicia sesión para ver tus apartados.</p>
                    <button 
                      onClick={() => { setShowCartPreview(false); setModalAuth({ abierto: true, modoRegistro: false }); }} 
                      className={`w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all ${isRed ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-zinc-200 hover:bg-white text-black'}`}
                    >
                      Iniciar Sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Autenticación / Estado de usuario */}
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
            <button onClick={() => setModalAuth({ abierto: true, modoRegistro: false })} className={`px-5 py-2 rounded transition-colors duration-500 shadow-lg ${getLoginButtonClass()}`}>
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* =========================================================
            MENÚ MÓVIL (Ordenado con los mismos 4 enlaces)
            ========================================================= */}
        <div className={`absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-zinc-800 flex flex-col gap-4 p-6 transition-all duration-300 md:hidden overflow-hidden ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 py-0 border-transparent'}`}>
          
          <button onClick={handleInicioClick} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Inicio
          </button>

          <button onClick={() => { navigate('/catalogo'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Catálogo
          </button>

          <button onClick={handleMapaClick} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2">
            Dónde Encontrarnos
          </button>
          
          <button onClick={() => { navigate('/carrito'); setMobileMenuOpen(false); }} className="text-zinc-400 hover:text-white text-left font-bold tracking-widest uppercase text-sm py-2 flex items-center gap-2">
            Ver Carrito
            {usuario && localCarritoCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{localCarritoCount}</span>
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

      {/* ==========================================
          RESTO DE LA PÁGINA HOME INTACTA
          ========================================== */}
      <section className="relative h-screen flex flex-col justify-center items-start px-8 md:px-24 bg-black overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920" 
            alt="Fondo Superdeportivos" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-3xl">
          <p className="text-blue-500 font-bold tracking-widest text-sm uppercase mb-4 mt-10">Redefiniendo la conducción</p>
          <h1 className="text-5xl md:text-8xl font-black text-white leading-tight mb-6">
            El camino a <br/>
            <span className="text-blue-500">tu manera.</span>
          </h1>
          <p className="text-zinc-300 text-base md:text-xl font-light mb-10 max-w-xl leading-relaxed">
            Explora nuestro catálogo exclusivo de vehículos diseñados bajo los más altos estándares de desempeño, lujo y sostenibilidad tecnológica.
          </p>
          <button 
            onClick={() => navigate('/catalogo')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold transition-all duration-300 flex items-center gap-3 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          >
            Ver Catálogo <span>→</span>
          </button>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-white text-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16">
          <div className="md:w-1/3">
            <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-4">AutoPremium CDMX</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Por qué elegir <br/>nuestra experiencia</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              No solo vendemos vehículos; entregamos obras maestras de la ingeniería moderna. Ofrecemos un ecosistema de compra transparente y soporte técnico capacitado.
            </p>
            <div className="flex gap-8">
              <div>
                <h3 className="text-4xl font-black text-blue-600">100%</h3>
                <p className="text-xs uppercase font-bold text-gray-500 mt-1">Clientes Satisfechos</p>
              </div>
              <div>
                <h3 className="text-4xl font-black text-black">10+</h3>
                <p className="text-xs uppercase font-bold text-gray-500 mt-1">Años de Liderazgo</p>
              </div>
            </div>
          </div>

          <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl mb-6 text-xl font-bold">🛡️</div>
              <h3 className="text-xl font-bold mb-3">Garantía Premium</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Cobertura total de fábrica y mantenimiento incluido durante los primeros tres años.</p>
            </div>
            
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl mb-6 text-xl font-bold">$</div>
              <h3 className="text-xl font-bold mb-3">Financiamiento</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Planes flexibles de arrendamiento puro y crédito con tasas preferenciales.</p>
            </div>
            
            <div className="p-8 bg-gray-900 text-white rounded-2xl border border-gray-800 shadow-lg md:col-span-2 flex items-center gap-6">
              <div className="w-16 h-16 bg-zinc-800 flex-shrink-0 flex items-center justify-center rounded-full text-2xl">✨</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Personalización Exclusiva a Medida</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Sabemos que un auto de lujo debe ser único. Para configurar colores, acabados interiores y detalles especiales, <strong>te invitamos a agendar una cita y visitar nuestra agencia físicamente</strong>. Un asesor diseñará el auto de tus sueños frente a ti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-[#f8f9fa] text-gray-900 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Colección de <span className="text-gray-500">Combustión.</span></h2>
            <p className="text-xl font-bold mb-8">Desde $650,000 MXN</p>
            
            <div className="space-y-6 mb-10">
              <div>
                <h4 className="text-lg font-bold">Motores Eficientes</h4>
                <p className="text-gray-600 text-sm">Bloques de 1.5L a 2.0L turbo de última generación para un excelente rendimiento diario.</p>
              </div>
              <div>
                <h4 className="text-lg font-bold">Alto Desempeño</h4>
                <p className="text-gray-600 text-sm">Imponentes configuraciones V6 y V8 atmosféricos con un rugido inconfundible.</p>
              </div>
              <div>
                <h4 className="text-lg font-bold">Tecnología Twin-Turbo</h4>
                <p className="text-gray-600 text-sm">Sistemas de sobrealimentación que maximizan la aceleración en cualquier rango de RPM.</p>
              </div>
            </div>

            <button onClick={() => navigate('/catalogo')} className="bg-zinc-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold transition-all w-full md:w-auto">
              Ver Catálogo de Gasolina
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-gray-300 rounded-3xl overflow-hidden relative shadow-2xl">
            <img src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800" alt="Auto Gasolina" className="w-full h-full object-cover"/>
            <span className="absolute top-4 right-4 bg-white/90 text-black px-4 py-1 rounded-full text-xs font-bold tracking-widest backdrop-blur-sm">LUJO CLÁSICO</span>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-slate-900 text-white border-t-4 border-blue-500">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Dinámica <span className="text-blue-400">Híbrida.</span></h2>
            <p className="text-blue-200 text-lg mb-8 font-light">La inteligencia de unir dos worlds.</p>
            <p className="text-slate-400 leading-relaxed mb-8">
              Experimenta el balance perfecto. Conduce en ciudad con cero consumo gracias a nuestras baterías de alta densidad, y desata la potencia del motor térmico para viajes largos sin preocuparte por la autonomía. Diseño aerodinámico y pantallas holográficas internas.
            </p>
            <button onClick={() => navigate('/catalogo')} className="border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white px-8 py-3 rounded-full font-bold transition-all w-full md:w-auto">
              Explorar Híbridos
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-slate-800 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(59,130,246,0.15)] relative">
            <img src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800" alt="Auto Hibrido" className="w-full h-full object-cover"/>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-black text-white relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">Revolución Eléctrica.</h2>
            <p className="text-zinc-400 text-lg mb-8 font-light">El futuro no hace ruido. Acelera.</p>
            <ul className="space-y-4 mb-8 text-zinc-300">
              <li className="flex items-center gap-3"><span className="text-[#00ffcc]">⚡</span> 0 a 100 km/h en menos de 2.1 segundos.</li>
              <li className="flex items-center gap-3"><span className="text-[#00ffcc]">🔋</span> Autonomías que superan los 600 kilómetros.</li>
              <li className="flex items-center gap-3"><span className="text-[#00ffcc]">🔌</span> Red de carga ultra-rápida exclusiva.</li>
            </ul>
            <button onClick={() => navigate('/catalogo')} className="bg-[#00ffcc] text-black px-8 py-3 rounded-sm font-bold uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,204,0.5)] w-full md:w-auto">
              Inicia la Carga
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full rounded-3xl overflow-hidden relative group shadow-[0_0_20px_rgba(0,255,204,0.2)]">
            <img src="https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&q=80&w=800" alt="Tesla Model S" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
          </div>
        </div>
      </section>

      <section ref={superdeportivosRef} className="py-24 px-8 md:px-24 bg-black text-white border-t-2 border-red-600 shadow-[inset_0_50px_100px_rgba(220,38,38,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16 relative z-10">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-red-600 uppercase tracking-tighter italic drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]">Adrenalina Pura.</h2>
            <div className="w-24 h-2 bg-red-600 mb-8 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Jaulas antivuelco, chasis monocasco de fibra de carbono y aerodinámica activa. Vehículos nacidos en la pista de carreras, presentados en una estética <span className="text-red-500 font-bold">oscura y sigilosa</span>, homologados estratégicamente para dominar las calles.
            </p>
            <button onClick={() => navigate('/catalogo')} className="bg-red-600 hover:bg-red-700 text-white border border-red-500 px-10 py-4 rounded font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] w-full md:w-auto">
              VER BESTIAS DE PISTA
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-[#050505] rounded-xl border border-red-900/50 overflow-hidden relative shadow-[0_20px_50px_rgba(220,38,38,0.2)] group">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-80"></div>
            <img src="https://i.pinimg.com/originals/2b/1f/53/2b1f53744c3ccb7b81a81086e3f289cc.jpg" alt="McLaren Superdeportivo" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"/>
          </div>
        </div>
      </section>

      {/* AGREGADO ID PARA QUE EL ANCHOR DESDE OTRAS PAGINAS DETECTE ESTA SECCIÓN */}
      <section ref={mapaRef} id="mapa-showroom" className="py-24 px-8 md:px-24 bg-[#050505] border-t border-zinc-900 text-white">
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
              src="https://maps.google.com/maps?q=Av%20Telecomunicaciones,%20Chinam%20Pac%20de%20Juárez,%20Iztapalapa,%2009208%20Ciudad%20de%20México,%20CDMX&t=&z=16&ie=UTF8&iwloc=&output=embed" 
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