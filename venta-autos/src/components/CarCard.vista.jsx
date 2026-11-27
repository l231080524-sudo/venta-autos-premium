import htmlVistas from "./CarCard.html?raw";
import { crearVistas } from "../plantillas.js";
import AccessibleDialog from './AccessibleDialog';
const vista = crearVistas(htmlVistas);
export function VistaCarCard({
  car,
  agregarAlCarrito,
  pending,
  setPending,
  showDetails,
  setShowDetails,
  failedImage,
  setFailedImage,
  specs,
  name,
  available
}) {
  return vista("h3", {
    "img": failedImage !== car.imagen ? vista("img", {}, {
      "img-src": {
        "src": car.imagen,
        "alt": `${name}, modelo ${car.anio}`,
        "onError": () => setFailedImage(car.imagen)
      }
    }) : vista("imagen-no-disponible-de", {
      "name": name
    }),
    "categories": categories[car.categoria] || car.categoria,
    "name": name,
    "anio": car.anio,
    "available": available ? 'Disponible' : 'Sin existencias',
    "to-locale-string": Number(car.precio).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }),
    "pending": pending ? 'Apartando…' : available ? 'Apartar' : 'Sin existencias',
    "accessible-dialog": showDetails && <AccessibleDialog title={name} onClose={() => setShowDetails(false)}>
        {vista("ficha-tecnica", {
        "categories": categories[car.categoria] || car.categoria,
        "anio": car.anio,
        "available": available ? 'Disponible' : 'Sin existencias',
        "p": car.descripcion && vista("p", {
          "descripcion": car.descripcion
        }),
        "length": Object.entries(specs).length ? Object.entries(specs).map(([key, value]) => vista("div", {
          "key": specificationLabels[key] || key.replaceAll('_', ' '),
          "string": String(value)
        }, {
          "div-key": {
            "key": key
          }
        })) : vista("div-2")
      })}
      </AccessibleDialog>
  }, {
    "h3": {
      "aria-labelledby": `car-${car.id}`
    },
    "h3-id": {
      "id": `car-${car.id}`
    },
    "button-disabled": {
      "disabled": !available || pending,
      "aria-label": `${pending ? 'Apartando' : available ? 'Apartar' : 'Sin existencias:'} ${name}`,
      "onClick": async () => {
        setPending(true);
        try {
          await agregarAlCarrito(car.id);
        } finally {
          setPending(false);
        }
      }
    },
    "mas-informacion": {
      "aria-label": `Más información sobre ${name}`,
      "onClick": () => setShowDetails(true)
    }
  });
}
export function VistaVehiculoEnCarga() {
  return vista("cargando-vehiculo");
}
const categories = {
  gasolina: 'Gasolina',
  hibrido: 'Híbrido',
  electrico: 'Eléctrico',
  superdeportivo: 'Superdeportivo'
};
const specificationLabels = {
  autonomia_ev: 'Autonomía eléctrica',
  traccion: 'Tracción',
  transmision: 'Transmisión',
  aceleracion: 'Aceleración',
  bateria: 'Batería'
};
