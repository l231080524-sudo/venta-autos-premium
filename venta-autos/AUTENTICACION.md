# Autenticación y verificación

## Flujo

- Iniciar sesión requiere correo y contraseña, además de un código por correo o de una app autenticadora vinculada.
- El registro crea una cuenta de cliente sin privilegios administrativos y exige validar el correo con OTP.
- Para vincular Google Authenticator o Microsoft Authenticator, abre **Mi cuenta → App autenticadora**, confirma tu contraseña y escanea el QR. Escribe el primer código de seis dígitos para activar la app.
- Los códigos por correo tienen seis dígitos, vencen en 10 minutos y se guardan en PostgreSQL como HMAC. La app autenticadora genera un código nuevo cada 30 segundos y la clave de vinculación se guarda cifrada.
- Se puede pedir un código nuevo por correo después de 60 segundos. Cada cuenta puede iniciar hasta cinco desafíos del mismo propósito en 15 minutos.
- Cinco errores de contraseña o de OTP de acceso en 15 minutos bloquean la cuenta durante 15 minutos.
- Las sesiones cierran tras 30 minutos de inactividad y tienen una duración máxima de 12 horas. El cierre de sesión revoca el registro del servidor.

## Preparar Neon y Render

1. Aplica las migraciones SQL hasta `db/006_auth_totp.sql` en la base Neon de la aplicación.
2. Configura el proveedor de correo en Render con las variables de `.env.example`. Gmail usa `AUTH_EMAIL_PROVIDER=gmail` y las variables `GMAIL_*`. Resend usa `RESEND_API_KEY` y `AUTH_EMAIL_FROM` con un remitente autorizado.
3. Mantén `AUTH_SECRET` en Render para firmar sesiones y proteger las claves de las apps autenticadoras. Tras desplegar, comprueba `/api/health`.

## Límites y protección

- Las claves, contraseñas, códigos y tokens no se devuelven al cliente desde los registros de desafíos ni se imprimen en los logs de la aplicación.
- Los OTP caducados, consumidos o usados cinco veces no se aceptan. Un OTP solo puede usarse una vez.
- Las solicitudes de código se limitan por cuenta y propósito en PostgreSQL; los intentos de acceso también tienen un límite por IP en el proceso del servidor.
- El tiempo de inactividad se controla en el navegador y en PostgreSQL; la expiración absoluta se verifica en el token firmado.
- Las cuentas nuevas necesitan confirmar el correo. Las cuentas antiguas se marcan como verificadas al aplicar la migración para conservar acceso.
