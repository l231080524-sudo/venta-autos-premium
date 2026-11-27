import htmlVistas from "./Panel.html?raw";
import { crearVistas } from "./plantillas.js";
import { AdminCarCard, AdminUserCard } from './Tarjetas.jsx';
import { EncabezadoPanel } from './App.vista.jsx';
const vista = crearVistas(htmlVistas);
export function VistaPanel({
  adminUser,
  tabActiva,
  setTabActiva,
  notificacion,
  loadingDatos,
  busqueda,
  setBusqueda,
  adminNombre,
  setAdminNombre,
  adminEmailPrefix,
  setAdminEmailPrefix,
  adminPass,
  setAdminPass,
  marca,
  setMarca,
  modelo,
  setModelo,
  anio,
  setAnio,
  precio,
  setPrecio,
  categoria,
  setCategoria,
  imagen,
  setImagen,
  descripcion,
  setDescripcion,
  specsInput,
  logoutAdmin,
  totalStock,
  valorInventario,
  unidadesVendidas,
  gananciasTotales,
  crearVehiculo,
  handleSaveVehiculo,
  eliminarVehiculo,
  registrarNuevoAdmin,
  handleSaveUsuario,
  eliminarUsuario,
  degradarCliente,
  vehiculosFiltrados,
  clientesFiltrados,
  adminsFiltrados,
  agregarSpec,
  cambiarSpec,
  eliminarSpec,
  pestañasRenderizadas
}) {
  return vista("panel-administrativo", {
    "encabezado-panel": <EncabezadoPanel usuario={adminUser} cerrarSesion={logoutAdmin} />,
    "div": notificacion.mensaje && vista("notificacion", {
      "mensaje": notificacion.mensaje
    }, {
      "div-class-name": {
        "className": `mb-8 p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider text-center animate-pulse shadow-lg ${notificacion.tipo === 'exito' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-red-950/40 border-red-800 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]'}`
      }
    }),
    "lista-pestanas-renderizadas": pestañasRenderizadas.map(tab => vista("pestana", {
      "etiqueta": tab.etiqueta
    }, {
      "button-key": {
        "key": tab.id,
        "onClick": () => setTabActiva(tab.id),
        "className": `px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition duration-300 whitespace-nowrap ${tabActiva === tab.id ? 'bg-white text-black font-black shadow-xl' : 'bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'}`
      }
    })),
    "sincronizando-base-de-datos-postgre-sql": loadingDatos ? vista("sincronizando-base-de-datos-postgre-sql") : vista("apartados-del-panel", {
      "desempeno-operativo": tabActiva === 'resumen' && vista("resumen-de-operaciones", {
        "to-locale-string": gananciasTotales.toLocaleString('es-MX'),
        "unidades-vendidas": unidadesVendidas,
        "to-locale-string-2": valorInventario.toLocaleString('es-MX'),
        "total-stock": totalStock
      }),
      "dar-de-alta-nueva-unidad": tabActiva === 'inventario' && vista("dar-de-alta-nueva-unidad", {
        "lista-specs-input": specsInput.map((spec, i) => vista("especificacion-vehiculo", {}, {
          "div-key": {
            "key": i
          },
          "clave-ej-motor": {
            "value": spec.clave,
            "onChange": e => cambiarSpec(i, 'clave', e.target.value)
          },
          "valor-ej-v8": {
            "value": spec.valor,
            "onChange": e => cambiarSpec(i, 'valor', e.target.value)
          },
          "contenido": {
            "onClick": () => eliminarSpec(i)
          }
        })),
        "length": vehiculosFiltrados.length,
        "lista-vehiculos-filtrados": vehiculosFiltrados.map(car => <AdminCarCard key={car.id} auto={car} onDelete={eliminarVehiculo} onSave={handleSaveVehiculo} />)
      }, {
        "form-on-submit": {
          "onSubmit": crearVehiculo
        },
        "input-value": {
          "value": marca,
          "onChange": e => setMarca(e.target.value)
        },
        "input-value-2": {
          "value": modelo,
          "onChange": e => setModelo(e.target.value)
        },
        "input-value-3": {
          "value": anio,
          "onChange": e => setAnio(e.target.value)
        },
        "input-value-4": {
          "value": precio,
          "onChange": e => setPrecio(e.target.value)
        },
        "select-value": {
          "value": categoria,
          "onChange": e => setCategoria(e.target.value)
        },
        "input-value-5": {
          "value": imagen,
          "onChange": e => setImagen(e.target.value)
        },
        "textarea-value": {
          "value": descripcion,
          "onChange": e => setDescripcion(e.target.value)
        },
        "spec": {
          "onClick": agregarSpec
        },
        "buscar": {
          "value": busqueda,
          "onChange": e => setBusqueda(e.target.value)
        }
      }),
      "base-de-clientes-premium": tabActiva === 'clientes' && vista("base-de-clientes-premium", {
        "lista-clientes-filtrados": clientesFiltrados.map(user => vista("fila-cliente", {
          "id": user.id,
          "nombre": user.nombre,
          "email": user.email,
          "span": Number(user.compras_totales) > 0 ? vista("cliente-vip", {
            "compras-totales": user.compras_totales
          }) : vista("detalle-de-compras"),
          "protegido": Number(user.compras_totales) > 0 ? vista("protegido") : vista("degradar", {}, {
            "degradar": {
              "onClick": () => degradarCliente(user.id, user.compras_totales)
            }
          })
        }, {
          "tr-key": {
            "key": user.id
          }
        })),
        "tr": clientesFiltrados.length === 0 && vista("sin-clientes")
      }),
      "registrar-nuevo-admin": tabActiva === 'admins' && vista("registrar-nuevo-admin", {
        "lista-admins-filtrados": adminsFiltrados.map(admin => <AdminUserCard key={admin.id} admin={admin} onSave={handleSaveUsuario} onDelete={eliminarUsuario} usuarioActualId={adminUser.id} currentUserRole={adminUser.rol} />)
      }, {
        "form-on-submit": {
          "onSubmit": registrarNuevoAdmin
        },
        "input-value": {
          "value": adminNombre,
          "onChange": e => setAdminNombre(e.target.value)
        },
        "ej-carlos": {
          "value": adminEmailPrefix,
          "onChange": e => setAdminEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))
        },
        "input-value-2": {
          "value": adminPass,
          "onChange": e => setAdminPass(e.target.value)
        }
      })
    }, {}, true)
  });
}
