import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, formatMoney, downloadReceipt } from '../api';
import MercadoPagoCard from '../components/MercadoPagoCard';
import usePaymentTracking from '../usePaymentTracking';
import { advisorURL } from '../support';

const labels={confirmado:'Pago de prueba confirmado',pendiente:'Pago pendiente',rechazado:'Pago rechazado',en_proceso:'Pago en proceso',cancelado:'Pago cancelado',reembolsado:'Pago reembolsado',reembolso_parcial:'Pago con reembolso parcial'};
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
  const tracking=usePaymentTracking(order,usuario,busy,setOrder,actualizarConteoCarrito);
  const refresh=useCallback(async()=> {
    if(!usuario?.token || refreshing.current) return;
    refreshing.current=true;
    setBusy(true); setError(''); setNeedsLogin(false);
    try {
      // Ignora status/approved y cualquier otro parámetro del retorno del navegador.
      // El servidor consulta la order a Mercado Pago y verifica importe, vendedor y referencia.
      const saved=await api(`/api/mercadopago/ordenes/${referencia}`,usuario);
      setOrder(saved);
      setConfig(await api('/api/mercadopago/config',usuario));
      const updated=await api(`/api/mercadopago/ordenes/${referencia}/sincronizar`,usuario,{method:'POST'});
      setOrder(updated); actualizarConteoCarrito();
    } catch(err) {setError(err.message);setNeedsLogin(err.status===401);}
    finally {refreshing.current=false;setBusy(false);}
  },[referencia,usuario,actualizarConteoCarrito]);
  useEffect(()=> {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  },[refresh]);
  const pay=useCallback(async(form)=> {
    setBusy(true); setError(''); setNeedsLogin(false);
    try {
      const result=await api(`/api/mercadopago/ordenes/${referencia}/pagar`,usuario,{method:'POST',body:JSON.stringify({...form,...(consent ? {acepto_cobro_real:true} : {})})});
      setOrder(result); actualizarConteoCarrito();
    } catch(err) {setError(err.message); setNeedsLogin(err.status===401); throw err;}
    finally {setBusy(false);}
  },[referencia,usuario,actualizarConteoCarrito,consent]);
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
  return <section className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="heading-large font-bold mb-6">Estado de tu pago</h1>
    {!usuario?.token ? <><p>Inicia sesión con la cuenta que creó la orden.</p><button className="primary-button mt-4" onClick={()=>setModalAuth({abierto:true,modoRegistro:false})}>Iniciar sesión</button></> : <>
      {error && <p role="alert" className="border border-line p-4 rounded-lg mb-4">{error} {needsLogin && <button onClick={()=>setModalAuth({abierto:true,modoRegistro:false})}>Volver a iniciar sesión</button>}</p>}
      {busy && <p role="status">Consultando el pago…</p>}
      {order && <div className="bg-panel border border-line p-6 rounded-xl space-y-4">
        <h2 aria-live="polite" aria-atomic="true" className="text-xl font-bold">{order.estado==='confirmado' && order.ambiente==='produccion' ? 'Pago confirmado' : labels[order.estado]}</h2>
        <p>{order.ambiente==='produccion' ? 'Cobro real por una demostración. No se entregará ningún vehículo.' : 'Operación Sandbox: no es una compra real.'}</p>
        <p>Importe: <strong>{formatMoney(order.importe)} MXN</strong></p>
        <ul>{order.items.map((item,i)=><li key={i}>{item.marca} {item.modelo} · {formatMoney(item.subtotal)} MXN</li>)}</ul>
        <p>Referencia: {order.referencia}</p>
        {order.metodo_pago && <p>Método: {order.metodo_pago}</p>}
        {order.confirmado_en && <p>Confirmación: {new Date(order.confirmado_en).toLocaleString('es-MX')}</p>}
        {order.estado==='confirmado' && <div>
          <button className="primary-button" disabled={downloading || busy} onClick={receipt}>
            {downloading ? 'Preparando PDF…' : 'Descargar comprobante PDF'}
          </button>
          <p className="mt-2">{order.ambiente==='produccion' ? 'Comprobante del cobro real.' : 'Comprobante de prueba - Sandbox.'} Incluye comprador, vehículos, importes y datos del pago.</p>
          <p role="status" aria-live="polite">{downloadStatus}</p>
        </div>}
        {order.estado==='rechazado' && <p>No se confirmó el pago. {order.detalle_pago==='rejected_by_issuer' ? 'La tarjeta fue rechazada por el emisor. ' : ''}{order.ambiente==='produccion' ? 'Consulta con tu banco o intenta con otra tarjeta.' : 'Para simular una aprobación, usa la tarjeta de prueba y escribe APRO en el nombre del titular.'}</p>}
        {order.estado==='en_proceso' && <p>El resultado aún no está confirmado. Vuelve a consultar más tarde; no inicies otro cobro.</p>}
        {tracking.watching && <div className="border border-line rounded-xl p-4">
          <p role="status">{tracking.stopped?'Terminó el seguimiento automático. Puedes actualizar el estado manualmente o pedir ayuda.':'Estamos revisando este intento automáticamente, hasta seis consultas. No se realizará otro cobro.'}</p>
          <p className="text-sm">Consultas automáticas: {tracking.count} de 6.</p>
          {tracking.stopped && <a className="inline-flex min-h-11 items-center underline" href={advisorURL} target="_blank" rel="noopener noreferrer">Pedir ayuda al asesor por WhatsApp</a>}
        </div>}
        {order.puede_recuperar && <div>
          <p>Falta recuperar el resultado del intento enviado. Este botón reutiliza exactamente la solicitud original; no inicia un segundo cobro. Antes de cancelar, hay que conocer su resultado.</p>
          <button disabled={busy} onClick={()=>pay({}).catch(()=>{})}>Recuperar resultado del intento</button>
        </div>}
        {order.puede_continuar && !order.puede_recuperar && config?.habilitado && <>
          {order.ambiente==='produccion' && <label className="flex gap-3 items-start"><input type="checkbox" checked={consent} onChange={event=>setConsentFor(event.target.checked ? `${referencia}:${order.importe}` : '')}/><span>Autorizo un único cobro real de {formatMoney(order.importe)} MXN por esta demostración y entiendo que no se entregará ningún vehículo.</span></label>}
          {(order.ambiente!=='produccion' || consent) && <>
            <div className="border border-line rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-xl">Método de pago</h3>
              <button className="primary-button w-full" disabled={busy || redirecting} onClick={openCheckout}>Pagar con Mercado Pago ↗</button>
              <p>Continúa en el checkout de Mercado Pago para elegir cómo pagar {formatMoney(order.importe)} MXN. Al regresar verificaremos el resultado.</p>
              <p className="text-center font-bold">O paga aquí con tarjeta</p>
            </div>
            <MercadoPagoCard amount={order.importe} email={order.ambiente==='produccion' ? order.comprador_email : config.comprador_prueba_email} publicKey={config.public_key} environment={order.ambiente} onSubmit={pay}/>
          </>}
        </>}
        {order.checkout_externo && !order.puede_recuperar && <div className="space-y-3">
          <p>Hay un checkout de Mercado Pago abierto para esta compra. Continúa con ese intento o actualiza su estado antes de iniciar otro pago.</p>
          <button className="primary-button" disabled={busy || redirecting} onClick={openCheckout}>Continuar en Mercado Pago ↗</button>
        </div>}
        {(order.puede_cancelar ?? order.puede_continuar) && <button disabled={busy} onClick={cancel}>Cancelar orden{order.ambiente==='produccion' ? '' : ' de prueba'}</button>}
      </div>}
      <div className="flex flex-wrap gap-4 mt-6"><button disabled={busy} onClick={refresh}>Actualizar estado</button><Link className="inline-flex min-h-11 items-center underline" to="/carrito">Volver al carrito</Link></div>
    </>}
  </section>;
}
