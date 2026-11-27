import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, downloadReceipt } from '../api';
import usePaymentTracking from '../usePaymentTracking';
import { VistaPagoResultado } from './PagoResultado.vista.jsx';

export default function PagoResultado({usuario,setModalAuth,actualizarConteoCarrito}) {
  const {referencia}=useParams();
  const navigate=useNavigate();
  const [order,setOrder]=useState(null);
  const [error,setError]=useState('');
  const [needsLogin,setNeedsLogin]=useState(false);
  const [busy,setBusy]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [downloadStatus,setDownloadStatus]=useState('');
  const [config,setConfig]=useState(null);
  const [consentFor,setConsentFor]=useState('');
  const [redirecting,setRedirecting]=useState(false);
  const refreshing=useRef(false);
  const consent=consentFor===`${referencia}:${order?.importe}`;
  const consentValue=useRef(false);
  useEffect(()=>{consentValue.current=consent;},[consent]);
  const tracking=usePaymentTracking(order,usuario,busy,setOrder,actualizarConteoCarrito);
  const refresh=useCallback(async()=> {
    if(!usuario?.token || refreshing.current) return;
    refreshing.current=true;
    setBusy(true); setError(''); setNeedsLogin(false);
    try {
      const saved=await api(`/api/mercadopago/ordenes/${referencia}`,usuario);
      setOrder(saved);
      setConfig(await api('/api/mercadopago/config',usuario));
      const updated=await api(`/api/mercadopago/ordenes/${referencia}/sincronizar`,usuario,{method:'POST'});
      setOrder(updated); actualizarConteoCarrito();
    } catch(err) {setError(err.message);setNeedsLogin(err.status===401);}
    finally {refreshing.current=false;setBusy(false);}
  },[referencia,usuario,actualizarConteoCarrito]);
  useEffect(()=> {
    refresh();
  },[refresh]);
  const pay=useCallback(async(form)=> {
    if(order?.ambiente==='produccion' && form?.token && !consentValue.current) {
      const failure=new Error('Autoriza el cobro real antes de pagar.');setError(failure.message);throw failure;
    }
    setBusy(true); setError(''); setNeedsLogin(false);
    try {
      const result=await api(`/api/mercadopago/ordenes/${referencia}/pagar`,usuario,{method:'POST',body:JSON.stringify({...form,...(consentValue.current ? {acepto_cobro_real:true} : {})})});
      setOrder(result); actualizarConteoCarrito();
    } catch(err) {setError(err.message); setNeedsLogin(err.status===401); throw err;}
    finally {setBusy(false);}
  },[referencia,usuario,actualizarConteoCarrito,order?.ambiente]);
  async function cancel() {
    setBusy(true);setError('');setNeedsLogin(false);
    try { await api(`/api/mercadopago/ordenes/${referencia}/cancelar`,usuario,{method:'POST'}); navigate('/carrito'); }
    catch(err) { setError(err.message);setNeedsLogin(err.status===401); }
    finally { setBusy(false); }
  }
  async function openCheckout() {
    if (busy || redirecting) return;
    setRedirecting(true);setBusy(true);setError('');
    try {
      const result=await api(`/api/mercadopago/ordenes/${referencia}/checkout`,usuario,{method:'POST',body:JSON.stringify({acepto_cobro_real:consent})});
      setOrder(result.orden);
      const target=new URL(result.checkout_url);
      if (target.protocol!=='https:' || !['www.mercadopago.com.mx','mercadopago.com.mx'].includes(target.hostname)
        || target.username || target.password || !target.pathname.startsWith('/checkout/')) throw new Error('Enlace de Mercado Pago inválido.');
      window.location.assign(target.href);
    } catch(err) {await refresh();setError(err.message);setNeedsLogin(err.status===401);}
    finally {setBusy(false);setRedirecting(false);}
  }
  async function receipt() {
    setDownloading(true);setError('');setDownloadStatus('Preparando comprobante PDF…');
    try { await downloadReceipt(referencia,usuario);setDownloadStatus('Comprobante preparado. Revisa las descargas de tu navegador.'); }
    catch(err) { setError(err.message);setNeedsLogin(err.status===401);setDownloadStatus(''); }
    finally { setDownloading(false); }
  }
  return <VistaPagoResultado {...{
    usuario, setModalAuth, referencia, order, error, needsLogin, busy,
    downloading, downloadStatus, config, setConsentFor, redirecting, consent,
    tracking, refresh, pay, cancel, openCheckout, receipt,
  }} />;
}
