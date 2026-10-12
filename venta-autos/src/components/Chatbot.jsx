import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api';
import './Chatbot.css';

// Destino fijo autorizado por el propietario; la IA no puede cambiarlo.
const ADVISOR_URL = `https://wa.me/5215564028025?text=${encodeURIComponent('Hola, necesito ayuda de un asesor con AutoPremium CDMX.')}`;
const HELP_TOPICS = [
  { label:'No puedo iniciar sesión', answer:'Comprueba tu correo y contraseña. Si la sesión venció, vuelve a iniciar sesión desde el icono de usuario. Si todavía no tienes cuenta, selecciona Registrarse. Si el problema continúa, contacta al asesor; no compartas tu contraseña.', advisor:false },
  { label:'Mi pago fue rechazado', answer:'Revisa el motivo que aparece en el pago y consulta con tu banco. Antes de intentar otra vez, revisa el estado de esa orden en el historial del Carrito. Un rechazo no confirma una compra. Si tienes dudas sobre un cargo, pide ayuda al asesor.', advisor:false },
  { label:'Me cobraron, pero no se confirma', answer:'No vuelvas a pagar mientras se revisa el cargo. Abre el historial del Carrito y consulta el estado de la misma orden. Si el banco muestra un cargo y la orden sigue sin confirmarse, contacta al asesor para revisar el caso.', advisor:true },
  { label:'No puedo descargar el comprobante', answer:'El PDF está disponible desde la página de un pago confirmado. Comprueba que hayas iniciado sesión con la cuenta que hizo la compra y revisa las descargas del navegador. Si el pago está confirmado y la descarga sigue fallando, contacta al asesor.', advisor:false },
  { label:'Tengo problemas con el carrito', answer:'Inicia sesión y agrega el vehículo desde el Catálogo. Si aparece una orden pendiente, revisa su estado en el historial antes de crear otra o quitar los vehículos. Si sigue fallando, cuéntame el mensaje de error sin incluir datos personales.', advisor:false },
  { label:'¿Se entrega un vehículo?', answer:'No. AutoPremium es una demostración: el cobro en producción es real, pero no incluye entrega de vehículos. Se cobra una sola vez el total seleccionado y el PDF es un comprobante de pago, no una factura fiscal.', advisor:false },
];
function SupportIcon() {
  return <svg viewBox="0 0 48 48" width="34" height="34" fill="none" aria-hidden="true">
    <circle cx="24" cy="19" r="7" fill="currentColor"/>
    <path d="M12 39c0-7 5-12 12-12s12 5 12 12H12Z" fill="currentColor"/>
    <path d="M10 23v-5a14 14 0 0 1 28 0v5M37 28v3c0 3-3 5-8 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <rect x="7" y="20" width="6" height="10" rx="3" fill="currentColor"/>
    <rect x="35" y="20" width="6" height="10" rx="3" fill="currentColor"/>
    <rect x="25" y="34" width="7" height="4" rx="2" fill="#163f69" stroke="currentColor" strokeWidth="2"/>
  </svg>;
}
function AdvisorLink() {
  return <a className="chat-advisor" href={ADVISOR_URL} target="_blank" rel="noopener noreferrer">Contactar asesor por WhatsApp</a>;
}

export default function Chatbot() {
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [enabled,setEnabled]=useState(null);
  const pending=useRef(false), controller=useRef(null), field=useRef(null), end=useRef(null), log=useRef(null);
  useEffect(()=>{
    if (!open) return;
    const abort=new AbortController();
    api('/api/chat/config',null,{signal:abort.signal}).then(data=>setEnabled(data.enabled)).catch(()=>{ if(!abort.signal.aborted) setEnabled(false); });
    field.current?.focus();
    return ()=>abort.abort();
  },[open]);
  useEffect(()=>{
    if (messages.length || busy) end.current?.scrollIntoView({block:'nearest'});
    else if (log.current) log.current.scrollTop=0;
  },[messages,busy]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  function chooseTopic(topic) {
    if (pending.current) return;
    setMessages(previous=>[...previous.slice(-18),{role:'user',text:topic.label},
      {role:'model',text:topic.answer,advisor:topic.advisor}]);
    setInput('');setError('');field.current?.focus();
  }
  async function send(event) {
    event.preventDefault();
    const text=input.trim();
    if (!text || pending.current || !enabled) return;
    pending.current=true; setBusy(true); setError('');
    const abort=new AbortController(); controller.current=abort;
    const timer=setTimeout(()=>abort.abort(),20000);
    try {
      const data=await api('/api/chat',null,{method:'POST',signal:abort.signal,
        body:JSON.stringify({mensaje:text,historial:messages.slice(-8).map(m=>({role:m.role,text:m.text}))})});
      setMessages(previous=>[...previous.slice(-18),{role:'user',text},{role:'model',text:data.respuesta,vehicles:data.vehiculos,advisor:data.asesor}]);
      setInput('');
    } catch (err) { setError(err.name==='AbortError' ? 'La consulta tardó demasiado. Intenta más tarde o abre el catálogo.' : err.message); }
    finally {clearTimeout(timer); pending.current=false; setBusy(false);}
  }
  return <aside className="autopremium-chat" aria-label="Asistente de AutoPremium">
    {open && <section className="chat-panel" aria-labelledby="chat-title" onKeyDown={e=>{if(e.key==='Escape') setOpen(false);}}>
      <header><h2 id="chat-title">Asistente AutoPremium</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar chat">×</button></header>
      <p className="chat-notice">Asistente con IA. No compartas datos personales, tarjetas ni contraseñas. Tus preguntas se envían a Google Gemini.</p>
      <div ref={log} className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        <p className="chat-bubble">Hola, ¿en qué puedo ayudarte? Elige un problema frecuente o escribe tu pregunta. Esta demostración tiene cobros reales, sin entrega de vehículos.</p>
        <div className="chat-topics" role="group" aria-label="Problemas frecuentes">
          {HELP_TOPICS.map(topic=><button key={topic.label} type="button" disabled={busy} onClick={()=>chooseTopic(topic)}>{topic.label}</button>)}
        </div>
        {messages.map((m,i)=><div key={i} className={`chat-bubble ${m.role==='user'?'chat-user':''}`}>
          <strong>{m.role==='user'?'Tú':'Asistente'}</strong><p>{m.text}</p>
          {m.advisor && <p>Un asesor puede ayudarte a revisar tu caso. Usa el botón de WhatsApp al final del chat.</p>}
          {m.vehicles?.map(v=><div key={v.id} className="chat-vehicle"><strong>{v.nombre}</strong><p>{v.anio} · {formatMoney(v.precio)} MXN</p><Link to="/catalogo" onClick={()=>setOpen(false)}>Ver catálogo</Link></div>)}
        </div>)}
        {busy && <p role="status">Consultando…</p>}<span ref={end}/>
      </div>
      {enabled===false && <p className="chat-status" role="status">La IA no está disponible por ahora. Puedes usar las opciones de ayuda o <Link to="/catalogo">consultar el catálogo</Link>.</p>}
      {error && <p className="chat-error" role="alert">{error} <Link to="/catalogo">Ver catálogo</Link></p>}
      <div className="chat-support"><AdvisorLink/><p>Abre WhatsApp y envía tu mensaje. No compartimos automáticamente esta conversación.</p></div>
      <form onSubmit={send}><label htmlFor="chat-message">Tu pregunta</label><textarea ref={field} id="chat-message" maxLength={1000} rows={2} value={input} onChange={e=>setInput(e.target.value)} disabled={busy} placeholder="Cuéntame qué problema tienes…"/>
        <div className="chat-actions"><button type="button" disabled={busy} onClick={()=>{setMessages([]);setError('');setInput('');field.current?.focus();}}>Nueva conversación</button><button type="submit" disabled={busy || !enabled || !input.trim()}>Enviar</button></div>
      </form>
    </section>}
    <div className="chat-launcher">
      {!open && <span className="chat-greeting" aria-hidden="true">¿Necesitas ayuda?</span>}
      <button className="chat-toggle" type="button" aria-label={open?'Cerrar asistente':'¿Necesitas ayuda?'} aria-expanded={open} onClick={()=>setOpen(!open)}><SupportIcon/></button>
    </div>
  </aside>;
}
