import htmlVistas from "./AuthModal.html?raw";
import { crearVistas } from "../plantillas.js";
import AccessibleDialog from './AccessibleDialog';
import { CaptchaAcceso } from '../CaptchaAcceso';
const vista = crearVistas(htmlVistas);
export function VistaAuthModal({
  setModalAuth,
  esRegistro,
  setEsRegistro,
  paso,
  error,
  setError,
  loading,
  nombre,
  setNombre,
  email,
  setEmail,
  password,
  setPassword,
  telefono,
  setTelefono,
  metodo,
  setMetodo,
  codigo,
  setCodigo,
  desafio,
  esperaReenvio,
  manejarEnvio,
  verificarCodigo,
  reenviarCodigo,
  volver,
  titulo,
  usaAutenticador,
  mostrarContrasena,
  setMostrarContrasena,
  captcha
}) {
  return <AccessibleDialog title={titulo} onClose={() => setModalAuth({
    abierto: false,
    modoRegistro: false
  })}>
      {vista("acceso-autopremium", {
      "titulo": paso === 'codigo' ? titulo : esRegistro ? 'Crear cuenta' : 'Acceso AutoPremium',
      "instrucciones": paso === 'codigo' ? usaAutenticador ? 'Abre tu app autenticadora y escribe el código actual de AutoPremium.' : `Enviamos un código a ${desafio?.destination || 'tu método de verificación'}. El código vence en 10 minutos.` : esRegistro ? 'Completa tus datos para crear una cuenta.' : 'Ingresa con tu correo y contraseña; después confirmarás con un código de un solo uso.',
      "aviso-de-error": error && vista("mensaje-de-error", {
        "error": error
      }),
      "credenciales": paso === 'credenciales' ? vista("credenciales", {
        "nombre-del-cliente": esRegistro && vista("nombre-de-registro", {}, {
          "auth-nombre": {
            "value": nombre,
            "onChange": event => setNombre(event.target.value)
          }
        }),
        "solo-registro": esRegistro && vista("telefono-de-registro", {}, {
          "auth-telefono": {
            "value": telefono,
            "onChange": event => setTelefono(event.target.value)
          }
        }),
        "metodos-de-verificacion": !esRegistro && vista("metodos-de-verificacion", {}, {
          "auth-method": {
            "checked": metodo === 'email',
            "onChange": () => setMetodo('email')
          },
          "metodo-app": {
            "checked": metodo === 'totp',
            "onChange": () => setMetodo('totp')
          }
        }),
        "captcha": !esRegistro && <CaptchaAcceso {...captcha} ocupado={loading} />,
        "texto-del-boton": loading ? 'Procesando…' : esRegistro ? 'Crear cuenta y verificar correo' : 'Continuar con verificación',
        "mensaje-de-registro": esRegistro ? '¿Ya tienes cuenta?' : '¿Eres nuevo cliente?',
        "enlace-de-registro": esRegistro ? 'Inicia sesión' : 'Regístrate aquí'
      }, {
        "formulario": {
          "aria-busy": loading,
          "onSubmit": manejarEnvio
        },
        "auth-email": {
          "value": email,
          "onChange": event => setEmail(event.target.value)
        },
        "auth-password": {
          "type": mostrarContrasena ? "text" : "password",
          "autoComplete": esRegistro ? 'new-password' : 'current-password',
          "minLength": esRegistro ? 8 : undefined,
          "value": password,
          "onChange": event => setPassword(event.target.value)
        },
        "ver-contrasena": {
          "aria-label": mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña",
          "data-visible": mostrarContrasena,
          "onClick": () => setMostrarContrasena(value => !value)
        },
        "enviar": {
          "disabled": loading
        },
        "cambiar-registro": {
          "onClick": () => {
            setEsRegistro(!esRegistro);
            setError(null);
          }
        }
      }) : vista("verificar-codigo", {
        "texto-del-boton": loading ? 'Verificando…' : 'Verificar e iniciar sesión',
        "reenviar-codigo": !usaAutenticador && vista("reenviar-codigo", {
          "texto-de-reenvio": esperaReenvio > 0 ? `Solicitar otro código en ${esperaReenvio} s` : 'Enviar otro código'
        }, {
          "enviar": {
            "disabled": loading || esperaReenvio > 0,
            "onClick": reenviarCodigo
          }
        })
      }, {
        "formulario": {
          "aria-busy": loading,
          "onSubmit": verificarCodigo
        },
        "auth-otp": {
          "value": codigo,
          "onChange": event => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))
        },
        "enviar": {
          "disabled": loading || codigo.length !== 6
        },
        "volver-al-acceso": {
          "disabled": loading,
          "onClick": volver
        }
      })
    })}
    </AccessibleDialog>;
}
