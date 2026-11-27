# AutoPremium

## Dónde está el HTML

- [index.html](./index.html) contiene el menú, la portada, el mapa y el pie.
- [src/pages](./src/pages) contiene el HTML del catálogo, el carrito y el estado del pago.
- [src/components](./src/components) contiene el HTML del acceso, el chat y la accesibilidad.
- [src/vistas.css](./src/vistas.css) contiene los estilos de las vistas. Los archivos `.jsx` conectan el HTML con React y la API.
- [El panel administrativo](../autopremium-admin/src) tiene sus propios archivos HTML para el acceso, el panel y las fichas.

La configuración de inicio de sesión en dos pasos y sus variables de Render están en [AUTENTICACION.md](./AUTENTICACION.md). Para configurar una base nueva, consulta las migraciones en [db](./db).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
