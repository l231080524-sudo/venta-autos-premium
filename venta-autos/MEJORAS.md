# Mejoras de uso y revisión de seguridad

El filtro de precio utiliza el máximo actual del catálogo y admite centavos. Restablecer
filtros muestra todas las categorías. Esto no cambia precios ni registros en Neon.
Catálogo y carrito aclaran que es una demostración, sin entrega, con dinero real en
producción y operaciones simuladas en prueba. Los precios se etiquetan como demostración.

El historial muestra referencia, ambiente, importe, fechas y método cuando existe, y
permite descargar el PDF de pagos confirmados mediante la sesión del propietario.
La descarga no crea ni reintenta un pago; el servidor vuelve a validar su acreditación.

Si existe un ID de Mercado Pago pendiente/en proceso, el resultado consulta solamente
esa orden, hasta seis veces, cada diez segundos después de terminar la consulta previa.
Se detiene al confirmar, cambiar de estado, fallar, salir de la página o pasar a segundo
plano. El usuario puede actualizar manualmente o acudir al asesor. No se automatizan
POST de creación/cobro, ni recuperación de solicitudes, cancelaciones o reembolsos.

Se revisaron vistas móviles, teclado, contraste y texto ampliado. El globo de ayuda se
oculta en móviles durante carrito/pago y se deja espacio al final para los enlaces.
El movimiento del globo no reduce la opacidad ni el contraste de su texto.

Se ejecutó npm audit fix sin --force en ambos proyectos. La página/servidor quedaron con
0 avisos. El panel conserva 7 avisos de herramientas de desarrollo de Tailwind 3;
npm audit --omit=dev devuelve 0. La corrección sugerida exige migrar a Tailwind 4 y queda
pendiente para una revisión específica del diseño del administrador. No se forzó esa migración.
Estas cifras reflejan la consulta realizada; deben comprobarse de nuevo cuando se actualice.

## Renovación de credenciales expuestas: pendiente en las cuentas externas

No se revocaron ni reemplazaron claves desde el repositorio. Para las credenciales que
quedaron visibles en capturas, generar reemplazos en la misma aplicación de Mercado Pago
y el mismo proyecto de Gemini, copiarlos en privado a Environment en Render y desplegar.
Actualizar también la Public Key si cambia. Mantener vendedor, aplicación, ambiente y
webhook coherentes. Probar las consultas de estado y el chat después del cambio.
No pegar valores en este documento, commits, capturas ni variables VITE_ privadas.
No cambiar AUTH_SECRET durante esta tarea: protege sesiones y solicitudes pendientes cifradas.

No requiere SQL adicional. El despliegue usa las variables existentes de Render/Vercel.
