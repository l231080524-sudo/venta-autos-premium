import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, downloadReceipt } from '../api';
import { VistaCarrito } from './Carrito.vista.jsx';

export default function Carrito({ usuario, setModalAuth, actualizarConteoCarrito }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tab, setTab] = useState('carrito');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [receiptRef,setReceiptRef]=useState('');
  const [receiptStatus,setReceiptStatus]=useState('');
  const [needsLogin,setNeedsLogin]=useState(false);
  useEffect(() => {
    if (!usuario?.token) return;
    let active = true;
    Promise.all([api('/api/apartados',usuario),api('/api/mercadopago/ordenes',usuario),api('/api/mercadopago/config',usuario)])
      .then(([cars,history,settings]) => {
        if (!active) return;
        setItems(cars); setSelectedIds(cars.map(car=>car.id)); setOrders(history); setConfig(settings);
      }).catch(err=>{ if(active) {setError(err.message);setNeedsLogin(err.status===401);} })
      .finally(()=>{ if(active) setLoading(false); });
    return ()=>{active=false;};
  },[usuario]);
  const selection=items.filter(item=>selectedIds.includes(item.id));
  const real=config?.ambiente==='produccion';
  const total=real ? selection.reduce((sum,item)=>sum+Math.round(Number(item.precio)*100),0)/100 : selection.length * Number(config?.precio_prueba || 0);
  async function remove(id) {
    setError(''); setBusy(true);
    try {
      await api(`/api/apartados/${id}`,usuario,{method:'DELETE'});
      setItems(current=>current.filter(item=>item.id!==id));
      setSelectedIds(current=>current.filter(value=>value!==id));
      actualizarConteoCarrito();
    } catch(err) { setError(err.message);setNeedsLogin(err.status===401); }
    finally { setBusy(false); }
  }
  async function receipt(reference) {
    if (receiptRef) return;
    setReceiptRef(reference);setReceiptStatus('Preparando comprobante…');setError('');setNeedsLogin(false);
    try {await downloadReceipt(reference,usuario);setReceiptStatus('Comprobante preparado. Revisa las descargas de tu navegador.');}
    catch(err) {setError(err.message);setNeedsLogin(err.status===401);setReceiptStatus('');}
    finally {setReceiptRef('');}
  }
  async function checkout(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const key=`checkout_${config?.ambiente || 'prueba'}_${usuario.id}_${[...selectedIds].sort((a,b)=>a-b).join('_')}`;
      let reference=sessionStorage.getItem(key);
      if(!reference) { reference=crypto.randomUUID(); sessionStorage.setItem(key,reference); }
      const order=await api('/api/mercadopago/ordenes',usuario,{method:'POST',body:JSON.stringify({apartados_ids:selectedIds,referencia:reference})});
      sessionStorage.removeItem(key);
      navigate(`/pago/${order.referencia}`);
    } catch(err) { setError(err.message);setNeedsLogin(err.status===401); }
    finally { setBusy(false); setShowPayment(false); }
  }
  return <VistaCarrito {...{
    usuario, setModalAuth, items, orders, config, selectedIds, setSelectedIds,
    tab, setTab, loading, error, busy, showPayment, setShowPayment, receiptRef,
    receiptStatus, needsLogin, selection, real, total, remove, receipt,
    checkout,
  }} />;
}
