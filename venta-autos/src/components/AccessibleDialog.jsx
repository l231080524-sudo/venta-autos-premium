import { useEffect, useRef } from 'react';
import { VistaAccessibleDialog } from './AccessibleDialog.vista.jsx';

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
  return <VistaAccessibleDialog {...{ title, onClose, children, ref, closeRef }} />;
}
