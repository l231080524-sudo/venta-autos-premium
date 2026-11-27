import { useEffect, useId, useState } from 'react';
import { VistaMercadoPagoCard } from './MercadoPagoCard.vista.jsx';

let sdkPromise;

function loadSDK() {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = resolve;
    script.onerror = () => { script.remove(); sdkPromise = null; reject(new Error('No se pudo cargar el formulario de Mercado Pago.')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export default function MercadoPagoCard({ amount, email, publicKey, environment, onSubmit }) {
  const [reload, setReload] = useState(0);
  const id = `mp-card-${useId().replace(/:/g, '')}-${reload}`;
  const [error, setError] = useState('');
  useEffect(() => {
    let retired = false, controller, submitting = false;
    async function mount() {
      try {
        const key = publicKey || (environment !== 'produccion' ? import.meta.env.VITE_MP_PUBLIC_KEY : '');
        if (!key) throw new Error('Falta configurar la Public Key para mostrar el formulario.');
        await loadSDK();
        if (retired) return;
        const mp = new window.MercadoPago(key, { locale: 'es-MX' });
        controller = await mp.bricks().create('cardPayment', id, {
          initialization: { amount: Number(amount), payer: { email } },
          customization: { paymentMethods: { minInstallments: 1, maxInstallments: 1 },
            visual: { style: { theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'flat' } } },
          callbacks: {
            onReady: () => { if (!retired) setError(''); },
            onError: (sdkError) => {
              if (retired) return;
              setError(sdkError?.message === 'empty_installments'
                ? 'Mercado Pago no ofrece un pago único para esta tarjeta y este importe. Revisa el precio o crea otra orden con un importe compatible. Recargar el formulario no cambia el importe de la orden.'
                : 'No se pudo preparar la información de pago. Revisa los datos de la tarjeta o recarga el formulario.');
            },
            onSubmit: async (formData, additionalData) => {
              if (submitting) throw new Error('Ya se está procesando este intento.');
              submitting = true;
              try {
                await onSubmit({ token: formData.token, payment_method_id: formData.payment_method_id,
                  payment_type_id: additionalData?.paymentTypeId, installments: formData.installments,
                  payer: formData.payer });
              } finally { submitting = false; }
            },
          },
        });
        if (retired) await controller.unmount();
      } catch (err) { if (!retired) setError(err.message); }
    }
    mount();
    return () => { retired = true; controller?.unmount(); };
  }, [id, amount, email, publicKey, environment, onSubmit]);
  return <VistaMercadoPagoCard {...{ amount, email, environment, setReload, id, error, setError }} />;
}
