import htmlVistas from "./AccessibilityWidget.html?raw";
import { crearVistas } from "../plantillas.js";
import { createPortal } from 'react-dom';
import AccessibleDialog from './AccessibleDialog';
import AccessibilitySettings from './AccessibilitySettings';
import { returnToTop } from '../navigationActions';
const vista = crearVistas(htmlVistas);
export function VistaAccessibilityWidget({
  settings,
  open,
  setOpen,
  launcher,
  keyboard,
  voice
}) {
  return createPortal(vista("acceso-a-accesibilidad", {
    "div": (voice.active || voice.status !== 'Micrófono apagado.') && vista("div", {
      "status": voice.status,
      "active": voice.active ? 'Detener voz' : 'Reactivar voz'
    }, {
      "button-on-click": {
        "onClick": voice.active ? voice.stop : voice.start
      }
    }),
    "volver-arriba": keyboard && vista("volver-arriba", {}, {
      "volver-arriba": {
        "onClick": returnToTop
      }
    }),
    "accessible-dialog": open && <AccessibleDialog title="Accesibilidad" onClose={() => setOpen(false)}>
      {vista("voice-title", {
        "accessibility-settings": <AccessibilitySettings {...settings} onReset={voice.stop} />,
        "activa-el-microfono-y-permite-su-uso": voice.supported ? vista("activa-el-microfono-y-permite-su-uso", {
          "active": voice.active ? 'Apagar micrófono' : 'Activar voz',
          "status": voice.status
        }, {
          "button-on-click": {
            "onClick": voice.active ? voice.stop : voice.start
          }
        }, true) : vista("este-navegador-no-admite-reconocimiento-de-voz")
      })}
    </AccessibleDialog>
  }, {
    "accessibility-launcher": {
      "ref": launcher,
      "aria-expanded": open,
      "onClick": () => setOpen(true)
    }
  }, true), document.body);
}
