# Activar un único cobro real por el total del carrito

Esta versión cobra dinero real por una demostración sin entrega de vehículos. El comprador ve esa condición y debe autorizar el importe antes de que aparezca el formulario. No hay anticipo ni cargo posterior. No se descuenta inventario ni se registran entregas.

## 1. Neon y precios

Ejecutar `db/003_produccion.sql` sobre la base que ya tiene las migraciones 001 y 002. Solo agrega `pagos.autorizado_en`; conserva todas las órdenes y pagos.

Cambiar los precios desde el administrador. El servidor valida importes positivos con hasta dos decimales. En producción el importe será la suma de los precios guardados en `vehiculos.precio`; por ejemplo, 100 + 80 = 180 MXN. No se acepta un importe enviado por el navegador. No existe un precio fijo de producción.

Las órdenes conservan sus precios históricos. Si cambias un precio después de crear una orden, cancela ese borrador antes de pagar y crea otra. No canceles ni borres un intento que esté pendiente en Mercado Pago.

## 2. Render

Deja `MP_ENABLED=false` durante la preparación. Configura en Environment:

| Variable | Valor |
|---|---|
| `MP_ENV` | `produccion` |
| `MP_ACCESS_TOKEN` | Access Token de producción de tu cuenta real |
| `MP_PUBLIC_KEY` | Public Key de la misma aplicación real |
| `MP_SELLER_ID` | ID de la cuenta real propietaria del token |
| `MP_APPLICATION_ID` | ID de esa aplicación real |
| `MP_WEBHOOK_SECRET` | Clave secreta del webhook de esa aplicación y ambiente |
| `DATABASE_URL` | Base Neon con las tres migraciones |
| `AUTH_SECRET` | Mantener el valor actual, sin regenerarlo |
| `CORS_ORIGINS` | URLs exactas del frontend público y del administrador |

`MP_TEST_UNIT_PRICE` y `MP_TEST_BUYER_EMAIL` solo se usan en prueba. No sustituyen los precios ni el correo del comprador en producción. El backend verifica `/users/me` antes del cobro: rechaza un vendedor de prueba, un ID distinto o un país distinto de México. La Public Key se entrega al frontend; el Access Token y la clave de webhook permanecen privados.

## 3. Mercado Pago y Vercel

En la aplicación REAL, configura el ambiente productivo del webhook:

`https://venta-autos-premium.onrender.com/api/mercadopago/webhook`

Selecciona **Order (Mercado Pago)**. Copia su clave secreta a Render. No uses la clave de la TestApp del vendedor de prueba. Mantén `VITE_API_URL` apuntando al backend en Vercel y despliega el nuevo frontend. En producción el Brick usa `MP_PUBLIC_KEY` de Render, aunque Vercel conserve una clave Sandbox antigua.

Con los tres despliegues y los precios revisados, cambia `MP_ENABLED=true` y espera a que Render termine de desplegar. El endpoint `/api/mercadopago/config` deberá devolver `ambiente: produccion` y `habilitado: true`; esto comprueba la configuración, no certifica un cargo real.

## 4. Verificar la primera operación real

Utiliza un comprador informado y una tarjeta real compatible con el importe. Comprueba el total en el carrito y en la orden antes de marcar la autorización. Los límites y la aprobación dependen de Mercado Pago y del banco: no se garantiza que cualquier importe pequeño sea admitido.

Verifica: estado `processed/accredited`, webhook entregado 200, ambiente `produccion` en Neon, un solo intento acreditado y PDF sin Sandbox, con importe e identificadores correctos. Los comprobantes antiguos siguen indicando Sandbox. Un timeout conserva la misma solicitud cifrada y clave de idempotencia; recupera la misma orden, sin crear otra compra.

Esta aplicación no inicia reembolsos: se gestionan desde Mercado Pago. Los estados reembolsados se muestran al sincronizar; no permiten descargar un nuevo comprobante de acreditación. Si necesitas volver a pruebas, deshabilita primero el cobro y configura las credenciales de prueba: las órdenes del otro ambiente se conservan, pero no pueden volver a pagarse con las nuevas credenciales.

La prueba de un cargo real requiere la configuración privada y la autorización del titular; las pruebas automáticas del repositorio usan PostgreSQL aislado y un proveedor simulado, nunca cobran dinero.

Referencias: [credenciales](https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders/resources/credentials), [consulta de Orders](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-api/get-order/get).
# Pago con Mercado Pago y tarjeta

La página del pago ofrece un botón «Pagar con Mercado Pago» encima del formulario de
tarjeta. El backend crea una Orders API en modo manual (Checkout Pro) y devuelve el
checkout_url oficial de Mercado Pago México. Las tarjetas en la página siguen utilizando
Orders API en modo automático. Ambos caminos conservan la misma referencia local, monto
histórico, consentimiento y verificación mediante GET/webhook antes de generar el PDF.

PUBLIC_SITE_URL configura el origen HTTPS del frontend para el retorno; por defecto es
https://venta-autos-premium-uv3b.vercel.app. No requiere nuevas migraciones ni nuevas claves.
El evento webhook sigue siendo Order (Mercado Pago), con la URL del backend existente.

Tras iniciar Checkout Pro, vuelve a usar «Continuar en Mercado Pago» o «Actualizar estado»;
no se ofrece otro cargo mientras el intento pueda procesarse. Los reintentos por red
conservan cuerpo y clave de idempotencia. No se confirma por los parámetros del retorno.
La ventana del checkout dura una hora y no permite reintentos de cobro dentro de ese intento.

Verificación local realizada con proveedor simulado. Confirmar la apertura del checkout en
la aplicación publicada; sus medios disponibles dependen de Mercado Pago y de la cuenta.
No se ejecutan compras reales como parte de las pruebas automatizadas.

