# Mercado Pago: configuración y pruebas

Esta guía describe Sandbox. Para cobros reales por el total del carrito y comprobantes PDF, sigue [PRODUCCION.md](PRODUCCION.md). Ejecuta también `db/003_produccion.sql` antes de usar esta versión.

La integración usa **Checkout API con Orders y Card Payment Brick**. La tarjeta se captura dentro de la página mediante MercadoPago.js. El backend recibe un token temporal y crea una order en `/v1/orders`; únicamente una consulta autenticada a Mercado Pago puede confirmar el pago. El precio de prueba es **$10 MXN por vehículo seleccionado**, fijado por el servidor.

## Estado de esta entrega

El código admite Sandbox y producción. Configura las credenciales del ambiente elegido y ejecuta las migraciones de la base. Las pruebas automáticas utilizan un proveedor controlado: no prueban tu cuenta ni generan cargos. El PDF está disponible para pagos acreditados e indica el ambiente real del pago.

Las pruebas no descuentan inventario ni suman ventas reales. Se limpia del carrito únicamente lo incluido en una orden confirmada. Los precios comerciales del catálogo siguen siendo históricos: el importe mostrado en el checkout de prueba es $10 por vehículo. Con la Visa de prueba, $1 devolvió `empty_installments` antes de enviar el cobro; $10 sí ofreció un pago único. Si otra tarjeta no ofrece planes compatibles, revisa `MP_TEST_UNIT_PRICE` al importe admitido y crea otra orden, porque las existentes conservan su importe original.

## 1. Base de datos

Los archivos SQL son incrementales; no borran las tablas ni el catálogo.

- **Local:** como ya ejecutaste el SQL del chat, ejecuta `db/002_checkout_orders.sql` en la misma base. Agrega las columnas que necesita el código para recuperar intentos y registrar transacciones. También puedes ejecutar `001_pagos.sql` antes: usa `IF NOT EXISTS`.
- **Neon:** primero crea una rama de pruebas de tu base existente. En el SQL Editor de esa rama, ejecuta `db/001_pagos.sql` y después `db/002_checkout_orders.sql`. Apunta el backend de pruebas a esa rama. Las pruebas confirmadas eliminan sus artículos del carrito: usar una rama separada evita afectar los carritos del sitio activo.
- Nunca ejecutes de nuevo las inserciones originales de usuarios/vehículos para aplicar estas migraciones.

Puedes verificar las tablas con:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ordenes', 'orden_detalles', 'pagos');
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pagos';
```

## 2. Credenciales

Para aplicaciones nuevas, Mercado Pago genera automáticamente **Access Token y Public Key de prueba** desde Tus integraciones → tu aplicación → Credenciales de prueba. Usa esas claves primero. Revisa que tu aplicación tenga Checkout API con Orders y país México.

En aplicaciones antiguas, la referencia de Orders también describe usar credenciales de una cuenta de vendedor de prueba. No confundas las claves productivas de esa cuenta ficticia con las de tu cuenta real. El servidor verifica el ID y país mediante `/users/me` y admite claves `TEST-` o cuentas marcadas `test_user` antes de crear una order. Si esa verificación falla, no se envía el pago.

El ID de aplicación es el mostrado en Developers. `MP_SELLER_ID` es el ID de la cuenta asociada al Access Token; no es el ID de la aplicación ni el comprador. Para tarjetas de prueba con Orders, `MP_TEST_BUYER_EMAIL` debe ser **`test@testuser.com`**, el correo fijo indicado por Mercado Pago. No necesitas obtener un correo de la cuenta TESTUSER ni guardar su usuario o contraseña en el proyecto.

Completa `.env` local con las variables de `.env.example`; conserva la URL de tu base existente si vas a trabajar localmente. El archivo de ejemplo contiene comentarios junto a cada valor que debes llenar. Las claves quedan vacías intencionalmente.

| Variable | Dónde va | Qué contiene |
|---|---|---|
| `DATABASE_URL` | Backend/.env o Render | PostgreSQL local o rama de Neon de pruebas |
| `AUTH_SECRET` | Backend/.env o Render | Cadena aleatoria de 32 caracteres como mínimo |
| `CORS_ORIGINS` | Backend/.env o Render | Orígenes públicos y admin exactos, separados por coma |
| `MP_ACCESS_TOKEN` | Backend/.env o Render | Access Token de pruebas |
| `MP_SELLER_ID` | Backend/.env o Render | ID de la cuenta asociada a ese token |
| `MP_APPLICATION_ID` | Backend/.env o Render | ID de esa aplicación |
| `MP_TEST_BUYER_EMAIL` | Backend/.env o Render | `test@testuser.com`, correo fijo de las pruebas con tarjeta |
| `MP_WEBHOOK_SECRET` | Backend/.env o Render | Secreto de Webhooks de esa aplicación |
| `MP_ENV` | Backend/.env o Render | `prueba` |
| `MP_TEST_UNIT_PRICE` | Backend/.env o Render | `10.00` |
| `MP_ENABLED` | Backend/.env o Render | `true` cuando termines la configuración |
| `VITE_API_URL` | Frontend público y admin/Vercel | URL del backend, sin `/api` al final |
| `VITE_MP_PUBLIC_KEY` | Frontend público/Vercel | Public Key de la misma aplicación de pruebas |

El Access Token, secreto de webhook y AUTH_SECRET nunca llevan prefijo `VITE_`. `.env` está excluido de Git. Para generar AUTH_SECRET puedes ejecutar:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Conserva esa clave entre reinicios. Además de firmar sesiones, cifra los payloads temporales para recuperar una respuesta perdida. No se guardan número de tarjeta ni CVV. El token temporal queda cifrado durante un intento sin respuesta y se elimina cuando se conoce el ID de Mercado Pago. No cambies la clave mientras existan intentos por recuperar.

## 3. Ejecutar localmente

Desde la raíz del repositorio, dos terminales independientes:

```powershell
# Terminal 1: backend. .env se lee desde venta-autos.
cd venta-autos
npm install
npm start
```

```powershell
# Terminal 2: frontend público. Reiniciar Vite al cambiar variables VITE_.
cd venta-autos
npm run dev
```

El administrador se ejecuta desde `autopremium-admin` con `npm run dev -- --port 5174`. Debe tener `VITE_API_URL` apuntando a la misma API. Ambos orígenes locales ya están en el ejemplo de CORS.

Todos los usuarios deben volver a iniciar sesión después del cambio: las sesiones antiguas no tienen token firmado. El backend decide los permisos a partir del rol en PostgreSQL. Los usuarios con contraseñas antiguas en texto plano se migran a hash al iniciar sesión correctamente.

## 4. Notificaciones

En Webhooks de tu aplicación, configura **pruebas** y el evento **Order (Mercado Pago)**, correspondiente a `orders_v2`. URL:

```text
https://TU-BACKEND/api/mercadopago/webhook
```

Guarda el secreto de firma en `MP_WEBHOOK_SECRET`. El backend valida `x-signature`, `x-request-id` y el ID de la URL, luego consulta `/v1/orders/{id}` y compara referencia, cuenta, aplicación, país e importe. Responde 200 después de persistir el resultado; ante errores pide reintento. Un ID simulado que no corresponde a una order local devuelve 503: para comprobar el flujo completo crea primero una orden desde el carrito.

El webhook necesita una URL HTTPS pública. En local usa un túnel hacia el puerto 3000. La consulta manual de estado funciona aunque no llegue un webhook; no reemplaza configurar las notificaciones para la prueba completa.

## 5. Probar el pago

1. Inicia sesión en AutoPremium y agrega un vehículo al carrito.
2. Selecciónalo, revisa el total de $10 MXN y pulsa Continuar al pago → Crear orden de prueba.
3. En la pantalla del pago aparecerá el formulario oficial dentro del sitio si la Public Key está configurada.
4. Usa únicamente una tarjeta de prueba, su CVV y vencimiento del panel; utiliza **`test@testuser.com`** en el campo correo. Para simular una aprobación escribe **APRO** como nombre del titular. La cuenta TESTUSER no contiene números de tarjeta: usa la tarjeta oficial de pruebas. No inventes un documento si el Brick mexicano no lo solicita.
5. Prueba un resultado aprobado y otro rechazado. Un rechazo debe conservar el carrito, ofrecer otro intento y permanecer en el historial. Un aprobado se muestra únicamente después de comprobar `processed` + `accredited` y el importe acreditado mediante la API.
6. Recarga o usa Actualizar estado para verificar persistencia. Cambiar parámetros de la URL a `approved` no debe confirmar nada.
7. Ante una respuesta perdida, vuelve a la misma orden y reintenta: se conserva la clave de idempotencia y el payload original, sin crear otro cobro. No borres registros en PostgreSQL para solucionar ese estado.

Cancelar orden de prueba abandona un borrador o un intento ya rechazado/cancelado en el proveedor. No cancela cargos pendientes ni hace reembolsos. Un intento que aún podría cobrar se mantiene bloqueado hasta conocer el resultado.

## 6. Publicación cuando termine la prueba

Hay cambios en **backend, frontend público y las solicitudes del administrador**. Será necesario actualizar Render y ambos proyectos Vercel, además de migrar la base elegida. En Render: raíz `venta-autos`, build `npm ci`, start `npm start`, y variables privadas de la tabla. En Vercel público: raíz `venta-autos`, build `npm run build`, salida `dist`; agrega las dos variables `VITE_`. En Vercel admin: raíz `autopremium-admin`, agrega `VITE_API_URL`. Cambiar una variable en Vercel requiere nuevo despliegue.

Para cobros reales utiliza [PRODUCCION.md](PRODUCCION.md): un único pago por el total del carrito, autorización explícita y comprobante de pago. Esta demostración no entrega vehículos ni descuenta inventario. Los estados de reembolso se reconocen al consultar, pero no hay un botón para solicitarlos ni una conciliación de reembolsos parciales.

## Verificación automática

```powershell
npm run lint
npm run build
npm run test:backend
npm run test:a11y
```

Las pruebas de integración PostgreSQL se habilitan con `TEST_DATABASE_URL` a un servidor aislado en localhost:55439. Nunca usan `DATABASE_URL`. Las pruebas de navegador interceptan las APIs y sustituyen el SDK; Playwright proporciona una Public Key ficticia para esa ejecución. Sin credenciales reales, estas pruebas no certifican la respuesta de tu cuenta ni la accesibilidad interna del Brick real.

## Documentación oficial consultada

- [Tarjetas y formulario dentro de la página](https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders/payment-integration/websites/cards).
- [Credenciales automáticas para nuevas aplicaciones](https://www.mercadopago.com.mx/developers/es/news/2025/11/19/Streamlined-integration-testing-with-automatic-credentials).
- [Crear order y errores HTTP, incluido 402](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-api/create-order/post).
- [Consultar order](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-api/get-order/get).
- [Pruebas con tarjetas](https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders/integration-test/cards).

## Recuperar y cancelar intentos

Si el POST queda sin resultado confirmado, pulsa **Recuperar resultado del intento**. El backend reutiliza el cuerpo y la clave originales. No se permite cancelar mientras el intento pueda cobrar. Un rechazo HTTP 402 puede traer la orden dentro de `data`: se guarda su ID y se consulta a Mercado Pago; tras confirmar el rechazo se permite reintentar con otra tarjeta o cancelar y regresar al carrito.
