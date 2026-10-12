import { useState, useEffect } from 'react';
import CarCard from '../components/CarCard';

export default function CatalogoUnico({ agregarAlCarrito }) {


  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [precioElegido, setPrecioMaximo] = useState(null);
  const limitePrecio=Math.max(1,...vehiculos.map(car=>Number(car.precio)).filter(price=>Number.isFinite(price) && price>0));
  const precioMaximo=Math.min(precioElegido ?? limitePrecio,limitePrecio);


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
  }, [API_URL]);

  const getVehiculosDeCategoria = (cat) => {
    return vehiculos
      .filter(car => car.categoria === cat)
      .filter(car => Number(car.precio) <= precioMaximo)
      .sort((a, b) => Number(a.precio) - Number(b.precio));
  };

  return (
    <div className="min-h-screen bg-surface text-content flex flex-col relative">


      {/* CABECERA CATÁLOGO */}
      <header className="relative min-h-[20rem] py-12 flex flex-col justify-center items-center text-center px-4 overflow-hidden pt-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center opacity-10 mix-blend-screen pointer-events-none"></div>
        <p className="text-muted font-bold uppercase tracking-normal text-sm md:text-sm mb-3">Inventario Exclusivo CDMX</p>
        <h1 className="heading-large font-black tracking-normal text-content">
          SHOWROOM <span className="text-content">DIGITAL</span>
        </h1>
        <div className="w-16 h-1 bg-panel mt-5 rounded-full opacity-50"></div>
      </header>

      {/* FILTROS */}
      <section aria-label="Filtros del catálogo" className="relative w-full max-w-[1400px] mx-auto px-4 md:px-8 mb-8">
        <div className="bg-surface backdrop-blur-xl p-4 rounded-2xl border border-line flex flex-col xl:flex-row items-center justify-between gap-6">
          <div role="group" aria-label="Categoría del vehículo" className="catalog-category-filters">
            {['todos', 'gasolina', 'hibrido', 'electrico', 'superdeportivo'].map((cat) => (
              <button
                key={cat} aria-pressed={categoriaFiltro === cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-4 py-3 md:py-2 text-sm uppercase tracking-normal font-bold rounded-lg text-center border ${
                  categoriaFiltro === cat
                    ? 'bg-panel text-content border-line '
                    : 'bg-transparent text-muted border-line hover:bg-panel hover:text-content'
                }`}
              >
                {{todos: 'Todos', gasolina: 'Gasolina', hibrido: 'Híbridos', electrico: 'Eléctricos', superdeportivo: 'Superdeportivos'}[cat]}
              </button>
            ))}
          </div>

          <div className="w-full xl:w-96 xl:shrink-0 min-w-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-between items-center mb-2">
              <label htmlFor="precio-maximo" className="text-sm font-bold">Precio máximo</label>
              <span className="text-sm md:text-sm font-ui font-bold text-content">
                ${precioMaximo.toLocaleString('es-MX')} MXN
              </span>
            </div>
            <input
              id="precio-maximo" aria-valuetext={`${precioMaximo.toLocaleString("es-MX")} pesos mexicanos`} type="range" min="0" max={limitePrecio} step="0.01" disabled={loading || !vehiculos.length}
              value={precioMaximo}
              onChange={(e) => setPrecioMaximo(Number(e.target.value))}
              className="w-full accent-zinc-400 bg-panel rounded-lg h-8 cursor-pointer"
            />
            <button type="button" onClick={()=>{setPrecioMaximo(null);setCategoriaFiltro('todos');}}>Restablecer filtros</button>
          </div>
        </div>
      </section>

      <p role="status" className="px-6 py-4">{!loading && !error ? `${vehiculos.filter(car => (categoriaFiltro === 'todos' || car.categoria === categoriaFiltro) && Number(car.precio) <= precioMaximo).length} vehículos encontrados` : ''}</p>
      {/* CONTENIDO PRINCIPAL: CATÁLOGO */}
      <div className="flex-1">
        {loading ? (
          <div role="status" className="flex flex-col justify-center items-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-line border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted text-sm tracking-normal uppercase font-bold">Sincronizando inventario...</p>
          </div>
        ) : error ? (
          <div role="alert" className="text-center py-24 px-6 mx-auto">
            <span className="heading-large">⚠️</span>
            <h2 className="text-lg font-bold text-content mt-4 mb-2">No se pudo cargar el catálogo</h2>
            <p className="text-sm text-muted mb-6">No pudimos cargar los vehículos. Revisa tu conexión e intenta recargar la página.</p>
          </div>
        ) : (
          <div className="w-full space-y-0">

            {/* GASOLINA */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'gasolina') && (
              <section className="py-24 px-6 md:px-12 text-content">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-normal text-muted">Clásicos de Combustión</span>
                    <h2 className="heading-large font-ui font-black mt-2 text-content">Colección Gasolina</h2>
                    <div className="w-20 h-1 bg-panel mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('gasolina').length === 0 ? (
                    <p className="text-muted italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('gasolina').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="gasolina" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* HÍBRIDO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'hibrido') && (
              <section className="py-24 px-6 md:px-12 border-t border-line">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-normal text-content">Doble Propulsión Inteligente</span>
                    <h2 className="heading-large font-ui font-black mt-2 text-content">Colección Híbridos</h2>
                    <div className="w-20 h-1 bg-panel mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('hibrido').length === 0 ? (
                    <p className="text-muted italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('hibrido').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="hibrido" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ELÉCTRICO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'electrico') && (
              <section className="py-24 px-6 md:px-12 border-t border-line">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-normal text-content">Emisiones Cero</span>
                    <h2 className="heading-large font-ui font-black mt-2 text-content">Colección Eléctricos</h2>
                    <div className="w-20 h-1 bg-panel mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('electrico').length === 0 ? (
                    <p className="text-muted italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('electrico').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="electrico" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SUPERDEPORTIVO */}
            {(categoriaFiltro === 'todos' || categoriaFiltro === 'superdeportivo') && (
              <section className="py-24 px-6 md:px-12 bg-surface border-t border-line">
                <div className="max-w-[1400px] mx-auto">
                  <div className="mb-12">
                    <span className="text-sm uppercase font-extrabold tracking-normal text-content italic">Desempeño Extremo de Pista</span>
                    <h2 className="heading-large font-extrabold uppercase mt-2 tracking-tight text-content">Superdeportivos</h2>
                    <div className="w-20 h-1 bg-panel mt-4"></div>
                  </div>
                  {getVehiculosDeCategoria('superdeportivo').length === 0 ? (
                    <p className="text-muted italic">No hay unidades bajo este rango.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {getVehiculosDeCategoria('superdeportivo').map(car => (
                        <div key={car.id} className="relative group">
                          <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme="superdeportivo" />
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


    </div>
  );
}
