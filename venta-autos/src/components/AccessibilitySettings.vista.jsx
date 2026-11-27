import htmlVistas from "./AccessibilitySettings.html?raw";
import { crearVistas } from "../plantillas.js";
const vista = crearVistas(htmlVistas);
export function VistaAccessibilitySettings({
  theme,
  setTheme,
  scale,
  setScale,
  contrast,
  setContrast,
  monochrome,
  setMonochrome,
  keyboard,
  setKeyboard,
  onReset,
  descriptions,
  setDescriptions,
  images
}) {
  return vista("div", {
    "lista-elementos": ['100', '125', '150', '175', '200'].map(value => vista("contenido", {
      "value": value
    }, {
      "contenido": {
        "key": value,
        "value": value
      }
    })),
    "controles-activados-en-el-encabezado-pulsa-f6": keyboard && vista("controles-activados-en-el-encabezado-pulsa-f6"),
    "textos-alternativos-de-las-imagenes": descriptions && vista("textos-alternativos-de-las-imagenes", {
      "lista-images": images.map(text => vista("li", {
        "text": text
      }, {
        "li-key": {
          "key": text
        }
      })),
      "no-hay-imagenes-informativas-en-esta-vista": !images.length && vista("no-hay-imagenes-informativas-en-esta-vista")
    })
  }, {
    "theme-choice": {
      "value": theme,
      "onChange": event => setTheme(event.target.value)
    },
    "text-choice": {
      "value": scale,
      "onChange": event => setScale(event.target.value)
    },
    "input-checked": {
      "checked": contrast,
      "onChange": event => setContrast(event.target.checked)
    },
    "input-checked-2": {
      "checked": monochrome,
      "onChange": event => setMonochrome(event.target.checked)
    },
    "input-checked-3": {
      "checked": keyboard,
      "onChange": event => setKeyboard(event.target.checked)
    },
    "input-checked-4": {
      "checked": descriptions,
      "onChange": event => setDescriptions(event.target.checked)
    },
    "restablecer-accesibilidad": {
      "onClick": () => {
        setTheme('dark');
        setScale('100');
        setContrast(false);
        setMonochrome(false);
        setKeyboard(false);
        setDescriptions(false);
        onReset?.();
      }
    }
  });
}
