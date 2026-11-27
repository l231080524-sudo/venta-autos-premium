import { useEffect, useState } from 'react';
import { VistaAccessibilitySettings } from './AccessibilitySettings.vista.jsx';

export default function AccessibilitySettings({ theme, setTheme, scale, setScale, contrast, setContrast, monochrome, setMonochrome, keyboard, setKeyboard, onReset }) {
  const [descriptions, setDescriptions] = useState(false);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (!descriptions) return;
    const main = document.getElementById('contenido-principal');
    if (!main) return;
    const update = () => setImages([...new Set([...main.querySelectorAll('img[alt]')].map(image => image.alt.trim()).filter(Boolean))]);
    const frame = requestAnimationFrame(update);
    const observer = new MutationObserver(update);
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['alt'] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [descriptions]);

  return <VistaAccessibilitySettings {...{
    theme, setTheme, scale, setScale, contrast, setContrast, monochrome,
    setMonochrome, keyboard, setKeyboard, onReset, descriptions,
    setDescriptions, images,
  }} />;
}
