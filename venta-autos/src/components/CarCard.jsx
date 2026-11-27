import { useState } from 'react';
import { VistaCarCard, VistaVehiculoEnCarga } from './CarCard.vista.jsx';

export default function CarCard({ car, agregarAlCarrito }) {
  const [pending, setPending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [failedImage, setFailedImage] = useState(null);
  if (!car) return <VistaVehiculoEnCarga />;
  let specs = {};
  try {
    const parsed = typeof car.especificaciones === 'string' ? JSON.parse(car.especificaciones) : car.especificaciones;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) specs = parsed;
  } catch {   }
  const name = `${car.marca} ${car.modelo}`;
  const available = Number(car.stock) > 0 && Boolean(agregarAlCarrito);
  return <VistaCarCard {...{
    car, agregarAlCarrito, pending, setPending, showDetails, setShowDetails,
    failedImage, setFailedImage, specs, name, available,
  }} />;
}
