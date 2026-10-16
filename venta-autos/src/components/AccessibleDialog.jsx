import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Native dialogs provide modal focus containment and make the background inert.
export default function AccessibleDialog({ title, onClose, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus();
      else document.getElementById('contenido-principal')?.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className="accessible-dialog" aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
          .filter(element => element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); closeRef.current(); }}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Cerrar ${title}`}>Cerrar ×</button>
      </div>
      <p className="dialog-keyboard-help">Tab y Mayús + Tab: recorrer controles · Enter o Espacio: activar botones · Flechas y Av Pág / Re Pág: desplazar contenido · Escape: cerrar.</p>
      {children}
    </dialog>, document.body,
  );
}
