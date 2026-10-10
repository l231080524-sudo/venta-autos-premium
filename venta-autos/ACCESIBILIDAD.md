# Accesibilidad del frontend público

## Alcance

Cambios locales en Inicio, Catálogo, Carrito, acceso y registro. No se modifican el servidor, el administrador, los precios ni los contratos de la API. El pago existente sigue siendo una simulación. No se añade navegación por voz.

## Estructura

- `src/components/SiteHeader.jsx`: navegación fija al desplazarse y menú circular de cuenta con preferencias de lectura.
- `src/components/Showroom.jsx`: mapa, dirección y horarios compartidos al final de las tres rutas.
- `src/components/AccessibleDialog.jsx`: ventanas modales, Escape, contención y devolución del foco.
- `src/components/AuthModal.jsx`: formulario de acceso y registro.
- `src/components/CarCard.jsx`: tarjeta compacta y ventana accesible con descripción y especificaciones.
- `src/components/SiteFooter.jsx`: pie de página compartido con enlaces, ubicación y horarios.
- `src/pages/`: Inicio, Catálogo y Carrito.
- `src/index.css`: tipografía única, paletas, foco y ajustes adaptables.
- `package.json`: librerías declaradas; `node_modules/`: librerías instaladas.
- `tests/accessibility.spec.js`: pruebas de navegador con API e imágenes simuladas.

## Implementado

- Arial con respaldo Helvetica/sans-serif en todo el frontend, incluidos importes y formularios.
- Menú único y fijo al desplazarse, enlaces nativos, página actual subrayada y menú móvil fuera del recorrido de Tab cuando está cerrado.
- Modo claro en azules suaves con acciones azul marino y modo oscuro en carbón, marfil y acentos dorados; texto de 100 a 200 %. Preferencias guardadas localmente, sin impedir el zoom del navegador.
- Enlace para saltar al contenido, título por ruta, idioma español y traslado del foco al navegar.
- Texto e indicadores explícitos de selección, disponibilidad y errores; no dependen solo del color.
- Foco visible, botones de al menos 44 px de alto y respeto por movimiento reducido.
- Imágenes informativas con alternativa, imágenes decorativas con alternativa vacía y respaldo textual cuando falla una foto de vehículo.
- Formularios con etiquetas vinculadas, autocompletado, avisos de error y ventanas desplazables.
- Tarjetas de igual altura por fila, con precio y acciones alineados. La descripción y las especificaciones completas se consultan con «Más información», sin truncarlas.
- Dirección escrita y enlace a Google Maps como alternativas al mapa incrustado.

## Contraste de la paleta

Relación calculada con luminancia relativa de los colores sRGB definidos en `src/index.css`:

| Combinación | Nocturno | Claro |
| --- | ---: | ---: |
| Texto principal / fondo | 17.52:1 | 12.08:1 |
| Texto secundario / panel | 9.79:1 | 7.42:1 |
| Texto / botón principal | 10.43:1 | 10.66:1 |
| Foco / fondo | 14.77:1 | 8.01:1 |
| Borde / panel | 5.02:1 | 4.41:1 |

El texto supera el umbral AAA de 7:1 para texto normal en esas combinaciones. Los ratios de paleta por sí solos no certifican páginas completas.

## Verificación reproducible

Desde la carpeta de este frontend:

```sh
npm install
npx playwright install chromium
npm run build
npm run lint:frontend
npm run test:a11y
```

Las 26 pruebas cubren las tres rutas en ambos temas, contraste automático reforzado con axe, tipografía, 320 px con texto al 200 %, menú móvil, teclado, ventanas, persistencia, filtros, stock, selección, errores e historial. También verifican una sola navegación en el catálogo, el mapa sin cambiar de ruta, pulsaciones repetidas de Inicio y ubicación, el panel de cuenta, inicio y cierre de sesión, y el mapa en móvil con movimiento reducido. Las solicitudes de API y los recursos externos están interceptados: no se contacta Neon ni se generan apartados o pagos reales. Las capturas generadas en `test-results/` utilizan fotos de prueba.

## Límite de la verificación AAA

No se declara conformidad WCAG 2.2 AAA completa. Una auditoría automática cubre solo parte de los criterios. Falta comprobar manualmente con NVDA/VoiceOver y otros navegadores, zoom real del navegador, espaciado de texto personalizado, contenido real del inventario y fichas técnicas, claridad de abreviaturas, procesos completos y el mapa de terceros. Las pruebas no validan la accesibilidad interna de Google Maps. Tampoco validan una pasarela real, porque aún no se ha integrado.

No hay audio ni video propios en las páginas revisadas. Si se añaden, habrá que evaluar subtítulos, transcripciones, audiodescripción y los demás requisitos multimedia aplicables.

Referencia: [WCAG 2.2 del W3C](https://www.w3.org/TR/WCAG22/).
