import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api';
import './Chatbot.css';

// Destino fijo autorizado por el propietario; la IA no puede cambiarlo.
const ADVISOR_URL = `https://wa.me/5215564028025?text=${encodeURIComponent('Hola, necesito ayuda de un asesor con AutoPremium CDMX.')}`;
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
  const pending=useRef(false), controller=useRef(null), field=useRef(null), end=useRef(null);
  useEffect(()=>{
    if (!open) return;
    const abort=new AbortController();
    api('/api/chat/config',null,{signal:abort.signal}).then(data=>setEnabled(data.enabled)).catch(()=>{ if(!abort.signal.aborted) setEnabled(false); });
    field.current?.focus();
    return ()=>abort.abort();
  },[open]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[messages,busy]);
  useEffect(()=>()=>controller.current?.abort(),[]);
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
      <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        <p className="chat-bubble">Puedo responder preguntas generales y ayudarte con vehículos, precios y el uso de la página. Es una demostración con cobro real, sin entrega de vehículos.</p>
        {messages.map((m,i)=><div key={i} className={`chat-bubble ${m.role==='user'?'chat-user':''}`}>
          <strong>{m.role==='user'?'Tú':'Asistente'}</strong><p>{m.text}</p>
          {m.advisor && <p>Un asesor puede ayudarte a revisar tu caso. Usa el botón de WhatsApp al final del chat.</p>}
          {m.vehicles?.map(v=><div key={v.id} className="chat-vehicle"><strong>{v.nombre}</strong><p>{v.anio} · {formatMoney(v.precio)} MXN</p><Link to="/catalogo" onClick={()=>setOpen(false)}>Ver catálogo</Link></div>)}
        </div>)}
        {busy && <p role="status">Consultando…</p>}<span ref={end}/>
      </div>
      {enabled===false && <p role="status">El asistente no está disponible por ahora. <Link to="/catalogo">Consultar catálogo</Link></p>}
      {error && <p className="chat-error" role="alert">{error} <Link to="/catalogo">Ver catálogo</Link></p>}
      <div className="chat-support"><AdvisorLink/><p>Abre WhatsApp y envía tu mensaje. No compartimos automáticamente esta conversación.</p></div>
      <form onSubmit={send}><label htmlFor="chat-message">Tu pregunta</label><textarea ref={field} id="chat-message" maxLength={1000} rows={2} value={input} onChange={e=>setInput(e.target.value)} disabled={busy} placeholder="¿Qué vehículos cuestan menos de $100?"/>
        <div className="chat-actions"><button type="button" disabled={busy} onClick={()=>{setMessages([]);setError('');setInput('');field.current?.focus();}}>Nueva conversación</button><button type="submit" disabled={busy || !enabled || !input.trim()}>Enviar</button></div>
      </form>
    </section>}
    <button className="chat-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Cerrar asistente':'¿Necesitas ayuda?'}</button>
  </aside>;
}
