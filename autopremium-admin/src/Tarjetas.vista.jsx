import htmlVistas from "./Tarjetas.html?raw";
import { crearVistas } from "./plantillas.js";
const vista = crearVistas(htmlVistas);
export function VistaFichaVehiculo({
  auto,
  onDelete,
  marca,
  setMarca,
  modelo,
  setModelo,
  precio,
  setPrecio,
  stock,
  setStock,
  categoria,
  setCategoria,
  isModified,
  handleSave
}) {
  return vista("div", {
    "categoria": auto.categoria,
    "div": Number(auto.stock) <= 0 && vista("div-2"),
    "guardar": isModified && vista("guardar", {}, {
      "guardar": {
        "onClick": handleSave
      }
    })
  }, {
    "img-src": {
      "src": auto.imagen,
      "alt": auto.modelo,
      "onError": e => e.target.src = "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80"
    },
    "input-value": {
      "value": marca,
      "onChange": e => setMarca(e.target.value)
    },
    "input-value-2": {
      "value": modelo,
      "onChange": e => setModelo(e.target.value)
    },
    "input-aria-label": {
      "aria-label": `Precio de ${auto.modelo} en MXN`,
      "value": precio,
      "onChange": e => setPrecio(e.target.value)
    },
    "input-value-3": {
      "value": stock,
      "onChange": e => setStock(e.target.value),
      "className": `w-full bg-black/50 border focus:border-zinc-500 rounded-lg p-2 text-xs text-white focus:outline-none font-mono font-bold transition ${Number(stock) <= 0 ? 'border-red-900/50 text-red-500' : 'border-zinc-800'}`
    },
    "select-value": {
      "value": categoria,
      "onChange": e => setCategoria(e.target.value)
    },
    "borrar": {
      "onClick": () => onDelete(auto.id),
      "className": `border border-red-900/40 text-red-500 hover:bg-red-950/40 hover:text-red-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition duration-300 ${isModified ? 'px-4' : 'flex-1'}`
    }
  });
}
export function VistaFichaUsuario({
  admin,
  onDelete,
  editando,
  setEditando,
  nombre,
  setNombre,
  rol,
  setRol,
  esUsuarioActual,
  esSuperAdmin,
  getBadgeColor,
  getRoleName,
  handleSave
}) {
  return vista("div-3", {
    "div": !editando ? vista("div-4", {
      "nombre": admin.nombre,
      "get-role-name": getRoleName(),
      "email": admin.email,
      "privilegios": esSuperAdmin && vista("privilegios", {
        "revocar": !esUsuarioActual && vista("revocar", {}, {
          "revocar": {
            "onClick": () => onDelete(admin.id)
          }
        })
      }, {
        "privilegios": {
          "onClick": () => setEditando(true)
        }
      }, true)
    }, {
      "span-class-name": {
        "className": `text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${getBadgeColor()}`
      }
    }, true) : vista("div-5", {}, {
      "input-value": {
        "value": nombre,
        "onChange": e => setNombre(e.target.value)
      },
      "select-value": {
        "value": rol,
        "onChange": e => setRol(e.target.value)
      },
      "guardar": {
        "onClick": handleSave
      },
      "cancelar": {
        "onClick": () => {
          setEditando(false);
          setNombre(admin.nombre);
          setRol(admin.rol);
        }
      }
    })
  });
}
