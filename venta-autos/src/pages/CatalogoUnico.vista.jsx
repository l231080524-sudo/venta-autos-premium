import CarCard from '../components/CarCard';
import { crearVistas } from '../plantillas';
import html from './CatalogoUnico.html?raw';

const vista = crearVistas(html);
const categorias = ['gasolina', 'hibrido', 'electrico', 'superdeportivo'];
const teclasDeslizador = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

export function VistaCatalogoUnico({
  agregarAlCarrito, vehiculos, loading, error, categoriaFiltro,
  setCategoriaFiltro, setPrecioMaximo, results, setScrollRequest,
  limitePrecio, precioMaximo, getVehiculosDeCategoria,
}) {
  const precioFormateado = precioMaximo.toLocaleString('es-MX');
  const totalResultados = vehiculos.filter(car => (
    (categoriaFiltro === 'todos' || car.categoria === categoriaFiltro) && Number(car.precio) <= precioMaximo
  )).length;

  const solicitarDesplazamiento = () => setScrollRequest(value => value + 1);
  const botonesCategoria = Object.fromEntries(['todos', ...categorias].map(categoria => {
    const activa = categoria === categoriaFiltro;
    return [categoria, {
      'aria-pressed': activa,
      className: activa
        ? 'bg-panel text-content border-line'
        : 'bg-transparent text-muted border-line hover:bg-panel hover:text-content',
      onClick: () => {
        setCategoriaFiltro(categoria);
        solicitarDesplazamiento();
      },
    }];
  }));

  const mostrarColeccion = categoria => {
    if (categoriaFiltro !== 'todos' && categoriaFiltro !== categoria) return null;
    const modelos = getVehiculosDeCategoria(categoria);
    const tarjetas = modelos.map(car => vista('resultado-vehiculo', {
      tarjeta: <CarCard car={car} agregarAlCarrito={car.stock > 0 ? agregarAlCarrito : undefined} theme={categoria} />,
    }, { vehiculo: { key: car.id } }));
    return vista('coleccion-' + categoria, {
      vehiculos: modelos.length ? vista('lista-vehiculos', { tarjetas }) : vista('sin-vehiculos'),
    });
  };

  let contenidoResultados;
  if (loading) contenidoResultados = vista('cargando-catalogo');
  else if (error) contenidoResultados = vista('error-catalogo');
  else contenidoResultados = vista('colecciones', Object.fromEntries(
    categorias.map(categoria => [categoria, mostrarColeccion(categoria)]),
  ));

  return vista('catalogo', {
    'precio-maximo': '$' + precioFormateado + ' MXN',
    'total-resultados': loading || error ? '' : totalResultados + ' vehículos encontrados',
    resultados: contenidoResultados,
  }, {
    ...botonesCategoria,
    'precio-maximo': {
      'aria-valuetext': precioFormateado + ' pesos mexicanos',
      max: limitePrecio,
      disabled: loading || !vehiculos.length,
      value: precioMaximo,
      onChange: event => setPrecioMaximo(Number(event.target.value)),
      onPointerUp: solicitarDesplazamiento,
      onKeyUp: event => {
        if (!event.altKey && !event.ctrlKey && !event.metaKey && teclasDeslizador.includes(event.key)) {
          solicitarDesplazamiento();
        }
      },
    },
    'restablecer-filtros': {
      onClick: () => {
        setPrecioMaximo(null);
        setCategoriaFiltro('todos');
        solicitarDesplazamiento();
      },
    },
    'resultados-catalogo': { ref: results },
  });
}
