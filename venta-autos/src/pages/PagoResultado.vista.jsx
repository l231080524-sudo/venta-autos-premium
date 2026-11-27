import htmlVistas from "./PagoResultado.html?raw";
import { crearVistas } from "../plantillas.js";
import { Link } from 'react-router-dom';
import { formatMoney } from '../api';
import MercadoPagoCard from '../components/MercadoPagoCard';
import { advisorURL } from '../support';
const vista = crearVistas(htmlVistas);
export function VistaPagoResultado({
  usuario,
  setModalAuth,
  referencia,
  order,
  error,
  needsLogin,
  busy,
  downloading,
  downloadStatus,
  config,
  setConsentFor,
  redirecting,
  consent,
  tracking,
  refresh,
  pay,
  cancel,
  openCheckout,
  receipt
}) {
  return vista("estado-de-tu-pago", {
    "inicia-sesion-con-la-cuenta-que-creo": !usuario?.token ? vista("inicia-sesion-con-la-cuenta-que-creo", {}, {
      "iniciar-sesion": {
        "onClick": () => setModalAuth({
          abierto: true,
          modoRegistro: false
        })
      }
    }, true) : vista("p", {
      "p": error && vista("p-2", {
        "error": error,
        "volver-a-iniciar-sesion": needsLogin && vista("volver-a-iniciar-sesion", {}, {
          "volver-a-iniciar-sesion": {
            "onClick": () => setModalAuth({
              abierto: true,
              modoRegistro: false
            })
          }
        })
      }),
      "consultando-el-pago": busy && vista("consultando-el-pago"),
      "h2": order && vista("h2", {
        "estado": order.estado === 'confirmado' && order.ambiente === 'produccion' ? 'Pago confirmado' : labels[order.estado],
        "ambiente": order.ambiente === 'produccion' ? 'Cobro real por una demostración. No se entregará ningún vehículo.' : 'Operación Sandbox: no es una compra real.',
        "format-money": formatMoney(order.importe),
        "lista-items": order.items.map((item, i) => vista("contenido", {
          "marca": item.marca,
          "modelo": item.modelo,
          "format-money": formatMoney(item.subtotal)
        }, {
          "contenido": {
            "key": i
          }
        })),
        "referencia": order.referencia,
        "metodo": order.metodo_pago && order.metodo_pago !== 'checkout_pro' && vista("metodo", {
          "metodo-pago": order.metodo_pago
        }),
        "confirmacion": order.confirmado_en && vista("confirmacion", {
          "to-locale-string": new Date(order.confirmado_en).toLocaleString('es-MX')
        }),
        "div": order.estado === 'confirmado' && vista("div", {
          "downloading": downloading ? 'Preparando PDF…' : 'Descargar comprobante PDF',
          "ambiente": order.ambiente === 'produccion' ? 'Comprobante del cobro real.' : 'Comprobante de prueba - Sandbox.',
          "download-status": downloadStatus
        }, {
          "button-disabled": {
            "disabled": downloading || busy,
            "onClick": receipt
          }
        }),
        "no-se-confirmo-el-pago": order.estado === 'rechazado' && vista("no-se-confirmo-el-pago", {
          "detalle-pago": order.detalle_pago === 'rejected_by_issuer' ? 'La tarjeta fue rechazada por el emisor. ' : '',
          "ambiente": order.ambiente === 'produccion' ? 'Consulta con tu banco o intenta con otra tarjeta.' : 'Para simular una aprobación, usa la tarjeta de prueba y escribe APRO en el nombre del titular.'
        }),
        "el-resultado-aun-no-esta-confirmado-vuelve": order.estado === 'en_proceso' && vista("el-resultado-aun-no-esta-confirmado-vuelve"),
        "div-2": tracking.watching && vista("div-2", {
          "stopped": tracking.stopped ? 'Terminó el seguimiento automático. Puedes actualizar el estado manualmente o pedir ayuda.' : 'Estamos revisando este intento automáticamente, hasta seis consultas. No se realizará otro cobro.',
          "count": tracking.count,
          "pedir-ayuda-al-asesor-por-whats-app": tracking.stopped && vista("pedir-ayuda-al-asesor-por-whats-app", {}, {
            "pedir-ayuda-al-asesor-por-whats-app": {
              "href": advisorURL
            }
          })
        }),
        "div-3": order.puede_recuperar && vista("div-3", {}, {
          "recuperar-resultado-del-intento": {
            "disabled": busy,
            "onClick": () => pay({}).catch(() => {})
          }
        }),
        "label": (order.puede_continuar || order.checkout_externo) && !order.puede_recuperar && config?.habilitado && vista("label", {
          "label": order.ambiente === 'produccion' && vista("label-2", {
            "format-money": formatMoney(order.importe)
          }, {
            "input-checked": {
              "checked": consent,
              "onChange": event => setConsentFor(event.target.checked ? `${referencia}:${order.importe}` : '')
            }
          }),
          "format-money": formatMoney(order.importe),
          "si-pagas-con-tarjeta-aqui-primero-cerraremos": order.checkout_externo && vista("si-pagas-con-tarjeta-aqui-primero-cerraremos"),
          "mercado-pago-card": <MercadoPagoCard amount={order.importe} email={order.ambiente === 'produccion' ? order.comprador_email : config.comprador_prueba_email} publicKey={config.public_key} environment={order.ambiente} onSubmit={pay} />
        }, {
          "pagar-con-mercado-pago": {
            "disabled": busy || redirecting || order.ambiente === 'produccion' && !consent,
            "onClick": openCheckout
          }
        }, true),
        "cancelar-orden": (order.puede_cancelar ?? order.puede_continuar) && vista("cancelar-orden", {
          "ambiente": order.ambiente === 'produccion' ? '' : ' de prueba'
        }, {
          "cancelar-orden": {
            "disabled": busy,
            "onClick": cancel
          }
        })
      }),
      "link": <Link className="inline-flex min-h-11 items-center underline" to="/carrito">Volver al carrito</Link>
    }, {
      "actualizar-estado": {
        "disabled": busy,
        "onClick": refresh
      }
    }, true)
  });
}
const labels = {
  confirmado: 'Pago de prueba confirmado',
  pendiente: 'Pago pendiente',
  rechazado: 'Pago rechazado',
  en_proceso: 'Pago en proceso',
  cancelado: 'Pago cancelado',
  reembolsado: 'Pago reembolsado',
  reembolso_parcial: 'Pago con reembolso parcial'
};
