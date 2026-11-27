import htmlVistas from "./AccessibleDialog.html?raw";
import { crearVistas } from "../plantillas.js";
import { createPortal } from 'react-dom';
const vista = crearVistas(htmlVistas);
export function VistaAccessibleDialog({
  title,
  onClose,
  children,
  ref,
  closeRef
}) {
  return createPortal(vista("h2", {
    "title": title,
    "children": children
  }, {
    "h2": {
      "ref": ref,
      "aria-label": title,
      "onKeyDown": event => {
        if (event.key !== 'Tab') return;
        const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      },
      "onCancel": event => {
        event.preventDefault();
        closeRef.current();
      }
    },
    "cerrar": {
      "onClick": onClose,
      "aria-label": `Cerrar ${title}`
    }
  }), document.body);
}
