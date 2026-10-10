import { useState } from 'react';
import AccessibleDialog from './AccessibleDialog';

const categories = { gasolina: 'Gasolina', hibrido: 'Híbrido', electrico: 'Eléctrico', superdeportivo: 'Superdeportivo' };
const specificationLabels = { autonomia_ev: 'Autonomía eléctrica', traccion: 'Tracción', transmision: 'Transmisión', aceleracion: 'Aceleración', bateria: 'Batería' };

export default function CarCard({ car, agregarAlCarrito }) {
  const [pending, setPending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [failedImage, setFailedImage] = useState(null);
  if (!car) return <p role="status">Cargando vehículo…</p>;
  let specs = {};
  try {
    const parsed = typeof car.especificaciones === 'string' ? JSON.parse(car.especificaciones) : car.especificaciones;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) specs = parsed;
  } catch { /* Incomplete specifications have a readable fallback. */ }
  const name = `${car.marca} ${car.modelo}`;
  const available = Number(car.stock) > 0 && Boolean(agregarAlCarrito);
  return (
    <article className="car-card" aria-labelledby={`car-${car.id}`}>
      <div className="car-image">
        {failedImage !== car.imagen ? <img src={car.imagen} alt={`${name}, modelo ${car.anio}`} loading="lazy" onError={() => setFailedImage(car.imagen)} /> :
          <p>Imagen no disponible de {name}</p>}
        <span className="category-label">{categories[car.categoria] || car.categoria}</span>
      </div>
      <div className="car-content">
        <h3 id={`car-${car.id}`}>{name}</h3>
        <p className="text-muted">Año {car.anio} · {available ? 'Disponible' : 'Sin existencias'}</p>
        <div className="car-purchase">
          <p><span className="text-muted">Precio de lista</span><strong>{Number(car.precio).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} MXN</strong></p>
          <button className="primary-button" disabled={!available || pending} aria-label={`${pending ? 'Apartando' : available ? 'Apartar' : 'Sin existencias:'} ${name}`}
            onClick={async () => { setPending(true); try { await agregarAlCarrito(car.id); } finally { setPending(false); } }}>
            {pending ? 'Apartando…' : available ? 'Apartar' : 'Sin existencias'}
          </button>
        </div>
        <button className="car-details-button" aria-haspopup="dialog" aria-label={`Más información sobre ${name}`} onClick={() => setShowDetails(true)}>Más información</button>
      </div>
      {showDetails && <AccessibleDialog title={name} onClose={() => setShowDetails(false)}>
        <div className="car-details-content">
          <p className="text-muted">{categories[car.categoria] || car.categoria} · Año {car.anio} · {available ? 'Disponible' : 'Sin existencias'}</p>
          {car.descripcion && <p>{car.descripcion}</p>}
          <h3>Ficha técnica</h3>
          <dl className="car-specs">
            {Object.entries(specs).length ? Object.entries(specs).map(([key, value]) => (
              <div key={key}><dt>{specificationLabels[key] || key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>
            )) : <div><dt>Especificaciones</dt><dd>Consulta la ficha técnica en nuestra agencia.</dd></div>}
          </dl>
        </div>
      </AccessibleDialog>}
    </article>
  );
}
