import html from './Acceso.html?raw';
import { crearVistas } from './plantillas';
import { CaptchaAcceso } from './CaptchaAcceso';

const vista = crearVistas(html);

export function VistaAcceso({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  challenge,
  setChallenge,
  otp,
  setOtp,
  loginError,
  setLoginError,
  loginLoading,
  manejarLoginSeguro,
  captcha
}) {
  return vista("acceso-administrativo", {
    "aviso-de-error": loginError && vista("error-de-acceso", {
      "mensaje-de-error": loginError
    }),
    "campos-de-acceso": challenge ? vista("verificar-codigo", {
      "destino-del-codigo": challenge.destination
    }, {
      "admin-otp": {
        "value": otp,
        "onChange": e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
      },
      "volver-al-acceso": {
        "disabled": loginLoading,
        "onClick": () => {
          setChallenge(null);
          setOtp('');
          setLoginError(null);
        }
      }
    }) : vista("correo-y-contrasena", {}, {
      "admin-login-email": {
        "value": loginEmail,
        "onChange": e => setLoginEmail(e.target.value)
      },
      "admin-login-password": {
        "value": loginPassword,
        "onChange": e => setLoginPassword(e.target.value)
      }
    }, true),
    "captcha": !challenge && <CaptchaAcceso {...captcha} ocupado={loginLoading} />,
    "texto-del-boton": loginLoading ? 'Verificando…' : challenge ? 'Verificar código' : 'Continuar con verificación'
  }, {
    "formulario-de-acceso": {
      "onSubmit": manejarLoginSeguro
    },
    "continuar": {
      "disabled": loginLoading,
      "className": `w-full font-black text-xs uppercase tracking-widest py-4 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(220,38,38,0.4)] mt-4 ${loginLoading ? 'bg-red-800 text-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`
    }
  });
}
