import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useLocation } from 'react-router-dom';
import { VistaChatbot } from './Chatbot.vista.jsx';

export default function Chatbot() {
  const location=useLocation();
  const checkoutPage=location.pathname==='/carrito' || location.pathname.startsWith('/pago/');
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [enabled,setEnabled]=useState(null);
  const pending=useRef(false), controller=useRef(null), field=useRef(null), end=useRef(null), log=useRef(null), launcher=useRef(null);
  useEffect(()=>{
    if (!open) return;
    const abort=new AbortController();
    api('/api/chat/config',null,{signal:abort.signal}).then(data=>{ if(!abort.signal.aborted) setEnabled(data.enabled); }).catch(()=>{ if(!abort.signal.aborted) setEnabled(false); });
    field.current?.focus();
    return ()=>abort.abort();
  },[open]);
  useEffect(()=>{
    if (messages.length || busy) end.current?.scrollIntoView({block:'nearest'});
    else if (log.current) log.current.scrollTop=0;
  },[messages,busy]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  function closeChat() {
    controller.current?.abort();
    controller.current=null;
    pending.current=false;
    setBusy(false);setMessages([]);setInput('');setError('');setEnabled(null);setOpen(false);
    launcher.current?.focus();
  }
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
      if (controller.current!==abort || abort.signal.aborted) return;
      setMessages(previous=>[...previous.slice(-18),{role:'user',text},{role:'model',text:data.respuesta,vehicles:data.vehiculos,advisor:data.asesor}]);
      setInput('');
    } catch (err) { if (controller.current===abort) setError(err.name==='AbortError' ? 'La consulta tardó demasiado. Intenta más tarde o abre el catálogo.' : err.message); }
    finally {clearTimeout(timer); if (controller.current===abort) { controller.current=null;pending.current=false;setBusy(false); }}
  }
  return <VistaChatbot {...{
    checkoutPage, open, setOpen, messages, setMessages, input, setInput, busy,
    error, setError, enabled, field, end, log, launcher, closeChat, chooseTopic,
    send,
  }} />;
}
