import htmlVistas from "./MercadoPagoCard.html?raw";
import { crearVistas } from "../plantillas.js";
const vista = crearVistas(htmlVistas);
export function VistaMercadoPagoCard({
  amount,
  email,
  environment,
  setReload,
  id,
  error,
  setError
}) {
  return vista("formulario-seguro-de-tarjeta", {
    "environment": environment === 'produccion' ? 'Pagar con tarjeta' : 'Tarjeta de prueba',
    "mercado-pago-procesara-un-unico-cargo-de": environment === 'produccion' ? vista("mercado-pago-procesara-un-unico-cargo-de", {
      "to-locale-string": Number(amount).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }),
      "email": email
    }) : vista("usa-los-datos-de-las-tarjetas-de", {
      "email": email
    }, {}, true),
    "div": error && vista("div", {
      "error": error
    }, {
      "recargar-formulario-de-tarjeta": {
        "onClick": () => {
          setError('');
          setReload(value => value + 1);
        }
      }
    })
  }, {
    "div-id": {
      "id": id
    }
  });
}
