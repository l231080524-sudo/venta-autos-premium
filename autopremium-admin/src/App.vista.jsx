import headerHtml from './App.html?raw';
import { crearVistas } from './plantillas';
const vista = crearVistas(headerHtml);
export function EncabezadoPanel({
  usuario,
  cerrarSesion
}) {
  return vista('encabezado', {
    nombre: usuario.nombre,
    id: usuario.id,
    rol: usuario.rol
  }, {
    'cerrar-sesion': {
      onClick: cerrarSesion
    }
  });
}
