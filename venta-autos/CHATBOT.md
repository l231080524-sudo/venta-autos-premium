# Asistente AutoPremium

Configurar GEMINI_API_KEY en Render. El modelo predeterminado es gemini-3.5-flash-lite;
GEMINI_MODEL permite seleccionar un modelo con cuota disponible en AI Studio. No activar
facturación para las pruebas gratuitas. La clave nunca se guarda en React o GitHub.

El botón «¿Necesitas ayuda?» abre el asistente. Usa información pública actual de hasta
100 vehículos ordenados por precio y las instrucciones del proyecto. No tiene acceso
a compradores, pagos, órdenes ni herramientas para modificar datos. Las tarjetas muestran
precios obtenidos de PostgreSQL; el texto de la IA puede contener errores y debe revisarse.

No compartir datos personales en el chat. Se omiten correos, números largos y patrones
de credenciales, pero esto no garantiza detectar nombres u otros datos personales. Las
preguntas se envían a Google y el nivel gratuito tiene sus propias condiciones de datos.
El historial reciente se mantiene únicamente en memoria del navegador; recargar o usar
«Nueva conversación» lo borra. No guardamos conversaciones en Neon ni las registramos.

Una petición al proveedor por mensaje, sin reintentos automáticos ni bucles de herramientas.
Máximo 1000 caracteres de entrada, 8 mensajes recientes, 1800 de salida, 15 segundos de
espera del proveedor y 2 solicitudes simultáneas. Límite 5 solicitudes/minuto por IP
observada por Express y CHAT_DAILY_LIMIT (20 por defecto) en todo el proceso por día UTC.
Detrás del proxy de Render varias personas pueden compartir el límite de IP. Los contadores
se reinician con un despliegue y no son un presupuesto persistente ni distribuido.

GET /api/chat/config informa si existe clave, no verifica su validez o cuota. Una respuesta
429 significa límite local o del proveedor; 503 indica configuración, red o respuesta inválida.
No retornamos errores privados del proveedor. Pagos y navegación siguen independientes.

Validación local con proveedor simulado: node --test backend/tests/chat.test.js;
npm run lint:frontend; npm run build; npx playwright test tests/chat.spec.js.
Tras desplegar, probar una pregunta del catálogo y una de ayuda en la página publicada.
La prueba local no certifica la clave, modelo ni cuota de la cuenta real.
