import { useEffect, useRef, useState } from 'react';
import { api } from './api';

// Solo consulta el mismo intento: jamás crea órdenes o vuelve a enviar una tarjeta.
export default function usePaymentTracking(order, user, busy, update, confirmed) {
  const key=`${order?.referencia || ''}:${order?.mp_order_id || ''}`;
  const watch=Boolean(user?.token && order?.mp_order_id && ['pendiente','en_proceso'].includes(order.estado));
  const attempts=useRef({key:'',count:0,stopped:false});
  const [progress,setProgress]=useState({key:'',count:0,stopped:false});
  useEffect(()=>{
    if (!watch || busy) return;
    if (attempts.current.key!==key) attempts.current={key,count:0,stopped:false};
    if (attempts.current.count>=6 || attempts.current.stopped) return;
    let active=true, timer;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),90000);
    async function check() {
      if (!active) return;
      if (document.visibilityState==='hidden') {
        attempts.current.stopped=true;
        setProgress({key,count:attempts.current.count,stopped:true});return;
      }
      attempts.current.count++;
      try {
        const result=await api(`/api/mercadopago/ordenes/${order.referencia}/sincronizar`,user,
          {method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
        if (!active) return;
        update(result);
        const waiting=['pendiente','en_proceso'].includes(result.estado);
        attempts.current.stopped=attempts.current.count>=6;
        setProgress({key,count:attempts.current.count,stopped:attempts.current.count>=6});
        if (result.estado==='confirmado') confirmed();
        if (waiting && attempts.current.count<6) timer=setTimeout(check,10000);
      } catch {
        if (active) {attempts.current.stopped=true;setProgress({key,count:attempts.current.count,stopped:true});}
      }
    }
    timer=setTimeout(check,10000);
    return ()=>{active=false;clearTimeout(timer);clearTimeout(timeout);controller.abort();};
  },[key,watch,busy,order?.referencia,user,update,confirmed]);
  return {watching:watch,stopped:watch && progress.key===key && progress.stopped,
    count:progress.key===key?progress.count:0};
}
