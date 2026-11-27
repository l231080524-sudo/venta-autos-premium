import htmlVistas from "./KeyboardNavigation.html?raw";
import { crearVistas } from "../plantillas.js";
import { NavLink } from 'react-router-dom';
import { returnToTop, scrollPage, showVehicleDetails } from '../navigationActions';
const vista = crearVistas(htmlVistas);
export function VistaKeyboardNavigation({
  onAccount,
  signedIn,
  onDisable,
  onNavigate,
  controls,
  pathname
}) {
  return vista("keyboard-controls-title", {
    "nav-link": <NavLink to="/" end onClick={onNavigate} aria-keyshortcuts="1">Inicio {vista("1")}</NavLink>,
    "nav-link-2": <NavLink to="/catalogo" onClick={onNavigate} aria-keyshortcuts="2">Catálogo {vista("2")}</NavLink>,
    "nav-link-3": <NavLink to="/carrito" onClick={onNavigate} aria-keyshortcuts="3">Carrito {vista("3")}</NavLink>,
    "signed-in": signedIn ? 'Mi cuenta' : 'Iniciar sesión',
    "mas-informacion": pathname === '/catalogo' && vista("mas-informacion", {}, {
      "mas-informacion": {
        "onClick": showVehicleDetails
      }
    })
  }, {
    "keyboard-controls-title": {
      "ref": controls
    },
    "desactivar": {
      "onClick": onDisable
    },
    "button-on-account": {
      "onClick": onAccount
    },
    "volver-arriba": {
      "onClick": returnToTop
    },
    "subir": {
      "onClick": () => scrollPage(-1)
    },
    "bajar": {
      "onClick": () => scrollPage(1)
    }
  });
}
