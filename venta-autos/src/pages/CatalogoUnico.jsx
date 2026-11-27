import { useState, useEffect, useRef } from 'react';
import { VistaCatalogoUnico } from './CatalogoUnico.vista.jsx';

export default function CatalogoUnico({ agregarAlCarrito }) {


  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [precioElegido, setPrecioMaximo] = useState(null);
  const results = useRef(null);
  const [scrollRequest, setScrollRequest] = useState(0);
  useEffect(() => {
    if (!scrollRequest || loading || error) return;
    const frame = requestAnimationFrame(() => {
      const target = results.current?.querySelector('.catalog-results-grid') || results.current;
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollRequest, loading, error]);
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

  return <VistaCatalogoUnico {...{
    agregarAlCarrito, vehiculos, loading, error, categoriaFiltro,
    setCategoriaFiltro, setPrecioMaximo, results, setScrollRequest,
    limitePrecio, precioMaximo, getVehiculosDeCategoria,
  }} />;
}
