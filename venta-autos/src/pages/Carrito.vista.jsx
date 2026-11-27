import htmlVistas from "./Carrito.html?raw";
import { crearVistas } from "../plantillas.js";
import { Link } from 'react-router-dom';
import AccessibleDialog from '../components/AccessibleDialog';
import { formatMoney } from '../api';
const vista = crearVistas(htmlVistas);
export function VistaCarrito({
  usuario,
  setModalAuth,
  items,
  orders,
  config,
  selectedIds,
  setSelectedIds,
  tab,
  setTab,
  loading,
  error,
  busy,
  showPayment,
  setShowPayment,
  receiptRef,
  receiptStatus,
  needsLogin,
  selection,
  real,
  total,
  remove,
  receipt,
  checkout
}) {
  return vista("mi-carrito-y-pagos", {
    "p": error && vista("p", {
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
    "inicia-sesion-para-continuar": !usuario?.token ? vista("inicia-sesion-para-continuar", {}, {
      "iniciar-sesion": {
        "onClick": () => setModalAuth({
          abierto: true,
          modoRegistro: false
        })
      }
    }) : loading ? vista("cargando-carrito") : vista("secciones-del-carrito", {
      "length": items.length,
      "length-2": orders.length,
      "real": real ? 'Se cobrará dinero real por el total seleccionado. Esta es una demostración y no incluye la entrega de vehículos.' : `Modo de prueba: ${formatMoney(config?.precio_prueba || 0)} MXN por vehículo. Utiliza únicamente el comprador y las tarjetas de prueba de Mercado Pago. Esta operación no compra ni reserva un vehículo real.`,
      "tu-carrito-esta-vacio": tab === 'carrito' && vista("tu-carrito-esta-vacio", {
        "tu-carrito-esta-vacio": items.length === 0 ? vista("tu-carrito-esta-vacio-2", {
          "link": <Link to="/catalogo" className="underline">Ver catálogo</Link>
        }) : vista("button", {
          "length": selectedIds.length === items.length ? 'Deseleccionar todos' : 'Seleccionar todos',
          "lista-items": items.map(item => vista("h2", {
            "marca": item.marca,
            "modelo": item.modelo,
            "format-money": formatMoney(item.precio),
            "cobro-de-prueba": !real && vista("cobro-de-prueba", {
              "format-money": formatMoney(config?.precio_prueba || 0)
            })
          }, {
            "h2": {
              "key": item.id
            },
            "input-disabled": {
              "disabled": busy,
              "aria-label": `Seleccionar ${item.marca} ${item.modelo}`,
              "checked": selectedIds.includes(item.id),
              "onChange": () => setSelectedIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])
            },
            "img-src": {
              "src": item.imagen,
              "alt": `${item.marca} ${item.modelo}`
            },
            "eliminar": {
              "disabled": busy,
              "onClick": () => remove(item.id),
              "aria-label": `Eliminar ${item.marca} ${item.modelo}`
            }
          })),
          "real": real ? 'Resumen del cobro' : 'Resumen de prueba',
          "length-2": selection.length,
          "format-money": formatMoney(total),
          "el-cobro-esta-pendiente-de-configuracion": !config?.habilitado && vista("el-cobro-esta-pendiente-de-configuracion")
        }, {
          "button-disabled": {
            "disabled": busy,
            "onClick": () => setSelectedIds(selectedIds.length === items.length ? [] : items.map(item => item.id))
          },
          "continuar-al-pago": {
            "disabled": busy || !selection.length || !config?.habilitado,
            "onClick": () => setShowPayment(true)
          }
        }, true)
      }, {}, true),
      "div": tab === 'pagos' && vista("div", {
        "receipt-status": receiptStatus,
        "aun-no-tienes-pagos-registrados": !orders.length && vista("aun-no-tienes-pagos-registrados"),
        "lista-orders": orders.map(order => vista("h2-2", {
          "estado": order.estado === 'confirmado' && order.ambiente === 'produccion' ? 'Pago confirmado' : stateLabels[order.estado],
          "ambiente": order.ambiente === 'produccion' ? 'Cobro real' : 'Sandbox',
          "estado-2": order.estado === 'confirmado' ? 'Completado' : 'Consulta el estado antes de pagar otra vez',
          "lista-items": order.items.map((item, i) => vista("li", {
            "marca": item.marca,
            "modelo": item.modelo
          }, {
            "li-key": {
              "key": i
            }
          })),
          "format-money": formatMoney(order.importe),
          "to-locale-string": new Date(order.creado_en).toLocaleString('es-MX'),
          "referencia": order.referencia,
          "metodo": order.metodo_pago && order.metodo_pago !== 'checkout_pro' && vista("metodo", {
            "metodo-pago": order.metodo_pago
          }),
          "confirmado": order.confirmado_en && vista("confirmado", {
            "to-locale-string": new Date(order.confirmado_en).toLocaleString('es-MX')
          }),
          "link": <Link className="inline-flex min-h-11 items-center underline" to={`/pago/${order.referencia}`}>Ver estado del pago</Link>,
          "button": order.estado === 'confirmado' && vista("button-2", {
            "receipt-ref": receiptRef === order.referencia ? 'Preparando PDF…' : 'Descargar comprobante PDF'
          }, {
            "button-disabled": {
              "disabled": Boolean(receiptRef),
              "onClick": () => receipt(order.referencia)
            }
          })
        }, {
          "h2": {
            "key": order.referencia
          }
        }))
      })
    }, {
      "carrito": {
        "aria-pressed": tab === 'carrito',
        "onClick": () => setTab('carrito')
      },
      "historial-de-pagos": {
        "aria-pressed": tab === 'pagos',
        "onClick": () => setTab('pagos')
      }
    }, true),
    "accessible-dialog": showPayment && <AccessibleDialog title={real ? 'Confirmar importe del cobro' : 'Confirmar pago de prueba'} onClose={() => !busy && setShowPayment(false)}>
      {vista("form", {
        "real": real ? `Se preparará un único cobro real por ${formatMoney(total)} MXN. No incluye entrega de vehículos. El importe definitivo se mostrará antes de autorizar el pago.` : `Vas a iniciar una operación de prueba por ${formatMoney(total)} MXN.`,
        "busy": busy ? 'Creando orden…' : real ? 'Crear orden' : 'Crear orden de prueba'
      }, {
        "form-on-submit": {
          "onSubmit": checkout,
          "aria-busy": busy
        },
        "button-disabled": {
          "disabled": busy
        }
      })}
    </AccessibleDialog>
  });
}
const stateLabels = {
  confirmado: 'Pago de prueba confirmado',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado',
  en_proceso: 'En proceso',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
  reembolso_parcial: 'Reembolso parcial'
};
