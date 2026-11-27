import htmlVistas from "./AuthenticatorDialog.html?raw";
import { crearVistas } from "../plantillas.js";
import AccessibleDialog from './AccessibleDialog';
const vista = crearVistas(htmlVistas);
export function VistaAuthenticatorDialog({
  onClose,
  enabled,
  setup,
  setSetup,
  password,
  setPassword,
  code,
  setCode,
  busy,
  error,
  setError,
  submit
}) {
  return <AccessibleDialog title="App autenticadora" onClose={onClose}>
      {vista("div", {
      "p": error && vista("p", {
        "error": error
      }),
      "consultando-la-configuracion": enabled === null && !error && vista("consultando-la-configuracion"),
      "app-autenticadora-activa-la-proxima-vez-que": enabled && vista("app-autenticadora-activa-la-proxima-vez-que"),
      "form": enabled === false && vista("form", {
        "escanea-el-qr-con-google-authenticator-o": setup ? vista("escanea-el-qr-con-google-authenticator-o", {}, {
          "img-src": {
            "src": setup.qr
          },
          "authenticator-key": {
            "className": INPUT,
            "spellCheck": false,
            "value": setup.manualKey,
            "onFocus": event => event.target.select()
          },
          "authenticator-code": {
            "className": INPUT,
            "value": code,
            "onChange": event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
          },
          "activar-app-autenticadora": {
            "className": BUTTON,
            "disabled": busy || code.length !== 6
          },
          "generar-otro-qr": {
            "disabled": busy,
            "onClick": () => {
              setSetup(null);
              setCode('');
              setError('');
            }
          }
        }, true) : vista("confirma-tu-contrasena-para-vincular-google-authenticator", {}, {
          "authenticator-password": {
            "className": INPUT,
            "value": password,
            "onChange": event => setPassword(event.target.value)
          },
          "generar-codigo-qr": {
            "className": BUTTON,
            "disabled": busy
          }
        }, true)
      }, {
        "form-aria-busy": {
          "aria-busy": busy,
          "onSubmit": submit
        }
      })
    })}
    </AccessibleDialog>;
}
const INPUT = 'w-full bg-surface border border-line rounded p-3 text-sm text-content';
const BUTTON = 'w-full bg-panel border border-line rounded p-3 text-sm font-bold text-content disabled:opacity-60';
