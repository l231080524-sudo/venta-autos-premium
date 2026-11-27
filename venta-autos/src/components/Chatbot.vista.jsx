import htmlVistas from "./Chatbot.html?raw";
import { crearVistas } from "../plantillas.js";
import { Link } from 'react-router-dom';
import { formatMoney } from '../api';
import './Chatbot.css';
import { advisorURL } from '../support';
const vista = crearVistas(htmlVistas);
export function VistaChatbot({
  checkoutPage,
  open,
  setOpen,
  messages,
  setMessages,
  input,
  setInput,
  busy,
  error,
  setError,
  enabled,
  field,
  end,
  log,
  launcher,
  closeChat,
  chooseTopic,
  send
}) {
  return vista("asistente-de-auto-premium", {
    "chat-title": open && vista("chat-title", {
      "lista-help-topics": HELP_TOPICS.map(topic => vista("button", {
        "label": topic.label
      }, {
        "button-key": {
          "key": topic.label,
          "disabled": busy,
          "onClick": () => chooseTopic(topic)
        }
      })),
      "lista-messages": messages.map((m, i) => vista("div", {
        "role": m.role === 'user' ? 'Tú' : 'Asistente',
        "text": m.text,
        "un-asesor-puede-ayudarte-a-revisar-tu": m.advisor && vista("un-asesor-puede-ayudarte-a-revisar-tu"),
        "contenido": m.vehicles?.map(v => vista("div-2", {
          "nombre": v.nombre,
          "anio": v.anio,
          "format-money": formatMoney(v.precio),
          "link": <Link to="/catalogo" onClick={closeChat}>Ver catálogo</Link>
        }, {
          "div-key": {
            "key": v.id
          }
        }))
      }, {
        "div-key": {
          "key": i,
          "className": `chat-bubble ${m.role === 'user' ? 'chat-user' : ''}`
        }
      })),
      "consultando": busy && vista("consultando"),
      "la-ia-no-esta-disponible-por-ahora": enabled === false && vista("la-ia-no-esta-disponible-por-ahora", {
        "link": <Link to="/catalogo">consultar el catálogo</Link>
      }),
      "p": error && vista("p", {
        "error": error,
        "link": <Link to="/catalogo">Ver catálogo</Link>
      }),
      "advisor-link": <AdvisorLink />
    }, {
      "chat-title": {
        "onKeyDown": e => {
          if (e.key === 'Escape') closeChat();
        }
      },
      "cerrar-chat": {
        "onClick": closeChat
      },
      "div-ref": {
        "ref": log
      },
      "span-ref": {
        "ref": end
      },
      "form-on-submit": {
        "onSubmit": send
      },
      "chat-message": {
        "ref": field,
        "value": input,
        "onChange": e => setInput(e.target.value),
        "disabled": busy
      },
      "nueva-conversacion": {
        "disabled": busy,
        "onClick": () => {
          setMessages([]);
          setError('');
          setInput('');
          field.current?.focus();
        }
      },
      "enviar": {
        "disabled": busy || !enabled || !input.trim()
      }
    }),
    "necesitas-ayuda": !open && vista("necesitas-ayuda"),
    "support-icon": <SupportIcon />
  }, {
    "asistente-de-auto-premium": {
      "className": `autopremium-chat${checkoutPage ? ' chat-checkout' : ''}`
    },
    "button-ref": {
      "ref": launcher,
      "aria-label": open ? 'Cerrar asistente' : '¿Necesitas ayuda?',
      "aria-expanded": open,
      "onClick": () => {
        if (open) closeChat();else setOpen(true);
      }
    }
  });
}
function SupportIcon() {
  return vista("svg");
}
function AdvisorLink() {
  return vista("contactar-asesor-por-whats-app", {}, {
    "contactar-asesor-por-whats-app": {
      "href": advisorURL
    }
  });
}
const HELP_TOPICS = [{
  label: 'No puedo iniciar sesión',
  answer: 'Comprueba tu correo y contraseña. Si la sesión venció, vuelve a iniciar sesión desde el icono de usuario. Si todavía no tienes cuenta, selecciona Registrarse. Si el problema continúa, contacta al asesor; no compartas tu contraseña.',
  advisor: false
}, {
  label: 'Mi pago fue rechazado',
  answer: 'Revisa el motivo que aparece en el pago y consulta con tu banco. Antes de intentar otra vez, revisa el estado de esa orden en el historial del Carrito. Un rechazo no confirma una compra. Si tienes dudas sobre un cargo, pide ayuda al asesor.',
  advisor: false
}, {
  label: 'Me cobraron, pero no se confirma',
  answer: 'No vuelvas a pagar mientras se revisa el cargo. Abre el historial del Carrito y consulta el estado de la misma orden. Si el banco muestra un cargo y la orden sigue sin confirmarse, contacta al asesor para revisar el caso.',
  advisor: true
}, {
  label: 'No puedo descargar el comprobante',
  answer: 'El PDF está disponible desde la página de un pago confirmado. Comprueba que hayas iniciado sesión con la cuenta que hizo la compra y revisa las descargas del navegador. Si el pago está confirmado y la descarga sigue fallando, contacta al asesor.',
  advisor: false
}, {
  label: 'Tengo problemas con el carrito',
  answer: 'Inicia sesión y agrega el vehículo desde el Catálogo. Si aparece una orden pendiente, revisa su estado en el historial antes de crear otra o quitar los vehículos. Si sigue fallando, cuéntame el mensaje de error sin incluir datos personales.',
  advisor: false
}, {
  label: '¿Se entrega un vehículo?',
  answer: 'No. AutoPremium es una demostración: el cobro en producción es real, pero no incluye entrega de vehículos. Se cobra una sola vez el total seleccionado y el PDF es un comprobante de pago, no una factura fiscal.',
  advisor: false
}];
