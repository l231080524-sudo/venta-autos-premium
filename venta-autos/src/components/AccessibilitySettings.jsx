import { useEffect, useState } from 'react';

export default function AccessibilitySettings({ theme, setTheme, scale, setScale, contrast, setContrast, monochrome, setMonochrome, keyboard, setKeyboard }) {
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

  return <details className="accessibility-settings">
    <summary className="accessibility-entry">
      <span className="accessibility-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="24" cy="24" r="19" /><circle cx="24" cy="13" r="2" fill="currentColor" stroke="none" />
          <path d="M13 20q11 4 22 0M24 19v10m0-1-6 12m6-12 6 12" strokeLinecap="round" />
        </svg>
      </span>
      <span>Accesibilidad</span><span className="accessibility-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 5 7 7-7 7" /></svg></span>
    </summary>
    <div className="reading-controls">
      <label htmlFor="theme-choice">Apariencia
        <select id="theme-choice" value={theme} onChange={event => setTheme(event.target.value)}>
          <option value="dark">Modo nocturno</option><option value="light">Modo claro</option>
        </select>
      </label>
      <label htmlFor="text-choice">Tamaño del texto
        <select id="text-choice" value={scale} onChange={event => setScale(event.target.value)}>
          {['100', '125', '150', '175', '200'].map(value => <option key={value} value={value}>{value} %</option>)}
        </select>
      </label>
      <label className="accessibility-toggle"><input type="checkbox" checked={contrast} onChange={event => setContrast(event.target.checked)} /> Alto contraste</label>
      <label className="accessibility-toggle"><input type="checkbox" checked={monochrome} onChange={event => setMonochrome(event.target.checked)} /> Colores en escala de grises</label>
      <label className="accessibility-toggle"><input type="checkbox" checked={keyboard} onChange={event => setKeyboard(event.target.checked)} /> Navegación por teclado</label>
      {keyboard && <p className="accessibility-help" role="status">Controles activados en el encabezado. Pulsa F6 para acceder a ellos.</p>}
      <p className="accessibility-help">Usa Tab y Mayús + Tab para moverte, Enter para seleccionar y Escape para cerrar ventanas. Las opciones y estados también se indican con texto.</p>
      <label className="accessibility-toggle"><input type="checkbox" checked={descriptions} onChange={event => setDescriptions(event.target.checked)} /> Mostrar textos alternativos</label>
      {descriptions && <section aria-label="Textos alternativos de las imágenes"><ul className="accessibility-image-list">{images.map(text => <li key={text}>{text}</li>)}</ul>{!images.length && <p>No hay imágenes informativas en esta vista.</p>}</section>}
      <div><h3>Subtítulos</h3><p className="accessibility-help">Esta página no contiene audio ni video que requiera subtítulos.</p></div>
      <button type="button" onClick={() => { setTheme('dark'); setScale('100'); setContrast(false); setMonochrome(false); setKeyboard(false); setDescriptions(false); }}>Restablecer accesibilidad</button>
    </div>
  </details>;
}
