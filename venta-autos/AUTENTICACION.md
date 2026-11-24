# Autenticación y verificación

## Flujo

- Iniciar sesión requiere correo y contraseña, además de un código OTP por correo o SMS.
- El registro crea una cuenta de cliente sin privilegios administrativos y exige validar el correo con OTP.
- Las cuentas existentes conservan el acceso por correo; el teléfono se verifica cuando se usa por primera vez el segundo factor SMS.
- Los OTP tienen seis dígitos, vencen en 10 minutos, permiten cinco intentos y se guardan en PostgreSQL como HMAC, nunca en texto plano.
- Se permite pedir un nuevo código después de 60 segundos, con un máximo de cinco envíos por cuenta y tipo de desafío cada 15 minutos.
- Cinco errores de contraseña o de OTP de acceso en 15 minutos bloquean la cuenta durante 15 minutos.
- Las sesiones cierran tras 30 minutos de inactividad y tienen una duración máxima de 12 horas. El cierre de sesión revoca el registro del servidor.

## Preparar Neon y Render

1. Ejecuta una vez el contenido de `db/004_auth_security.sql` en la base Neon que ya usa la aplicación.
2. En Render, agrega `RESEND_API_KEY` y `AUTH_EMAIL_FROM` para habilitar OTP por correo. El dominio o remitente debe estar autorizado en Resend.
3. En Render, agrega `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_FROM_NUMBER` para habilitar SMS. Usa un número emisor válido de Twilio y conserva las credenciales solo en Render.
4. Espera el despliegue de Render y comprueba `/api/health`. La clave de cada proveedor nunca debe ir en Vercel, en una variable `VITE_` ni en GitHub.

La ruta SMS requiere un proveedor con capacidad de enviar mensajes y puede generar cargos. En cuentas de prueba de Twilio, el teléfono de destino debe estar verificado en Twilio. Si falta un proveedor, ese método devuelve un error claro y no crea una sesión.

## Límites y protección

- Las claves, contraseñas, códigos y tokens no se devuelven al cliente desde los registros de desafíos ni se imprimen en los logs de la aplicación.
- Los OTP caducados, consumidos o usados cinco veces no se aceptan. Un OTP solo puede usarse una vez.
- Las solicitudes de código se limitan por cuenta y propósito en PostgreSQL; los intentos de acceso también tienen un límite por IP en el proceso del servidor.
- El tiempo de inactividad se controla en el navegador y en PostgreSQL; la expiración absoluta se verifica en el token firmado.
- Las cuentas nuevas necesitan confirmar el correo. Las cuentas antiguas se marcan como verificadas al aplicar la migración para conservar acceso.
