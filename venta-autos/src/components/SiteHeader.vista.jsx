import htmlVistas from "./SiteHeader.html?raw";
import { crearVistas } from "../plantillas.js";
import { createPortal } from 'react-dom';
import AccessibilityWidget from './AccessibilityWidget';
import KeyboardNavigation from './KeyboardNavigation';
import AuthenticatorDialog from './AuthenticatorDialog';
const vista = crearVistas(htmlVistas);
export function VistaSiteHeader({
  usuario,
  logout,
  setModalAuth,
  menuOpen,
  setMenuOpen,
  profileOpen,
  setProfileOpen,
  authenticatorUser,
  setAuthenticatorUser,
  theme,
  setTheme,
  scale,
  setScale,
  contrast,
  setContrast,
  monochrome,
  setMonochrome,
  keyboard,
  setKeyboard,
  menuButton,
  profileButton,
  closePanels,
  keyboardAccount
}) {
  const acciones = vista("acciones", {
    "menu-open": menuOpen ? 'Cerrar menú' : 'Menú',
    "menu-open-2": menuOpen ? '×' : '☰',
    "panel-cuenta": profileOpen && vista("panel-cuenta", {
      "usuario": usuario ? 'Mi cuenta' : 'Tu cuenta',
      "p": usuario ? vista("p", {
        "nombre": usuario.nombre
      }) : vista("iniciar-sesion", {}, {
        "iniciar-sesion": {
          "onClick": () => {
            profileButton.current?.focus();
            setProfileOpen(false);
            setModalAuth({
              abierto: true,
              modoRegistro: false
            });
          }
        }
      }),
      "app-autenticadora": usuario && vista("app-autenticadora", {}, {
        "app-autenticadora": {
          "onClick": () => {
            profileButton.current?.focus();
            setProfileOpen(false);
            setAuthenticatorUser(usuario.token);
          }
        },
        "cerrar-sesion": {
          "onClick": () => {
            profileButton.current?.focus();
            logout();
          }
        }
      }, true)
    }, {
      "cerrar-cuenta-y-preferencias": {
        "onClick": () => {
          setProfileOpen(false);
          profileButton.current?.focus();
        }
      }
    })
  }, {
    "button-ref": {
      "ref": menuButton,
      "aria-expanded": menuOpen,
      "onClick": () => {
        setMenuOpen(!menuOpen);
        setProfileOpen(false);
        if (!menuOpen) requestAnimationFrame(() => document.querySelector("#navegacion-principal a")?.focus());
      }
    },
    "div-on-blur": {
      "onBlur": event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false);
      }
    },
    "cuenta-y-preferencias": {
      "ref": profileButton,
      "aria-expanded": profileOpen,
      "onClick": () => {
        setProfileOpen(!profileOpen);
        setMenuOpen(false);
      }
    }
  });

  const controles = vista("controles", {
    "keyboard-navigation": keyboard && <KeyboardNavigation onAccount={keyboardAccount} signedIn={Boolean(usuario)} onNavigate={closePanels} onDisable={() => {
      setKeyboard(false);
      profileButton.current?.focus();
    }} />,
    "accessibility-widget": <AccessibilityWidget onAccount={keyboardAccount} {...{
      theme,
      setTheme,
      scale,
      setScale,
      contrast,
      setContrast,
      monochrome,
      setMonochrome,
      keyboard,
      setKeyboard
    }} />,
    "authenticator-dialog": authenticatorUser && authenticatorUser === usuario?.token && <AuthenticatorDialog user={usuario} onClose={() => setAuthenticatorUser(null)} />
  }, {}, true);

  return <>
    {createPortal(acciones, document.getElementById("acciones-encabezado"))}
    {createPortal(controles, document.getElementById("controles-accesibilidad"))}
  </>;
}
