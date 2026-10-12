import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccessibleDialog from '../components/AccessibleDialog';
import { api, formatMoney, downloadReceipt } from '../api';
import DemoNotice from '../components/DemoNotice';

const stateLabels = { confirmado: 'Pago de prueba confirmado', pendiente: 'Pendiente', rechazado: 'Rechazado', en_proceso: 'En proceso', cancelado: 'Cancelado', reembolsado: 'Reembolsado', reembolso_parcial: 'Reembolso parcial' };
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
      // Solo se envían IDs y una referencia; el servidor fija y guarda el importe.
      // Se conserva la referencia por selección incluso después de recargar o de un timeout.
      const key=`checkout_${config?.ambiente || 'prueba'}_${usuario.id}_${[...selectedIds].sort((a,b)=>a-b).join('_')}`;
      let reference=sessionStorage.getItem(key);
      if(!reference) { reference=crypto.randomUUID(); sessionStorage.setItem(key,reference); }
      const order=await api('/api/mercadopago/ordenes',usuario,{method:'POST',body:JSON.stringify({apartados_ids:selectedIds,referencia:reference})});
      sessionStorage.removeItem(key); // Ya persistida: el servidor reutiliza la orden activa.
      // La página de la orden permite reintentar la conexión sin generar cobros duplicados.
      navigate(`/pago/${order.referencia}`);
    } catch(err) { setError(err.message);setNeedsLogin(err.status===401); }
    finally { setBusy(false); setShowPayment(false); }
  }
  return <div className="min-h-screen bg-surface text-content px-4 md:px-12 py-12">
    <div className="max-w-7xl mx-auto">
      <h1 className="heading-large font-bold mb-6">Mi carrito y pagos</h1>
      <DemoNotice />
      {error && <p role="alert" className="bg-panel border border-line rounded-lg p-4 mb-4">{error} {needsLogin && <button onClick={()=>setModalAuth({abierto:true,modoRegistro:false})}>Volver a iniciar sesión</button>}</p>}
      {!usuario?.token ? <section className="bg-panel p-8 rounded-2xl">
        <h2 className="text-xl font-bold">Inicia sesión para continuar</h2>
        <p>Si tenías una sesión anterior, vuelve a entrar para usar el nuevo sistema de pagos.</p>
        <button className="primary-button mt-4" onClick={()=>setModalAuth({abierto:true,modoRegistro:false})}>Iniciar sesión</button>
      </section> : loading ? <p role="status">Cargando carrito…</p> : <>
        <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Secciones del carrito">
          <button aria-pressed={tab==='carrito'} onClick={()=>setTab('carrito')}>Carrito ({items.length})</button>
          <button aria-pressed={tab==='pagos'} onClick={()=>setTab('pagos')}>Historial de pagos ({orders.length})</button>
        </div>
        <p className="bg-panel border border-line p-4 rounded-lg mb-6">{real ? 'Se cobrará dinero real por el total seleccionado. Esta es una demostración y no incluye la entrega de vehículos.' : `Modo de prueba: ${formatMoney(config?.precio_prueba || 0)} MXN por vehículo. Utiliza únicamente el comprador y las tarjetas de prueba de Mercado Pago. Esta operación no compra ni reserva un vehículo real.`}</p>
        {tab==='carrito' && <>
          {items.length===0 ? <p>Tu carrito está vacío. <Link to="/catalogo" className="underline">Ver catálogo</Link></p> : <>
            <button disabled={busy} className="mb-4" onClick={()=>setSelectedIds(selectedIds.length===items.length?[]:items.map(item=>item.id))}>{selectedIds.length===items.length?'Deseleccionar todos':'Seleccionar todos'}</button>
            <div className="checkout-layout">
              <div className="grid gap-4">
                {items.map(item=><article key={item.id} className="bg-panel border border-line rounded-xl p-4 flex flex-wrap gap-4 items-center">
                  <input type="checkbox" disabled={busy} aria-label={`Seleccionar ${item.marca} ${item.modelo}`} checked={selectedIds.includes(item.id)} onChange={()=>setSelectedIds(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id])}/>
                  <img src={item.imagen} alt={`${item.marca} ${item.modelo}`} className="w-32 rounded-lg"/>
                  <div className="flex-1 min-w-0"><h2 className="text-lg font-bold">{item.marca} {item.modelo}</h2><p>Precio de catálogo: {formatMoney(item.precio)} MXN</p>{!real && <p>Cobro de prueba: {formatMoney(config?.precio_prueba || 0)} MXN</p>}</div>
                  <button disabled={busy} onClick={()=>remove(item.id)} aria-label={`Eliminar ${item.marca} ${item.modelo}`}>Eliminar</button>
                </article>)}
              </div>
              <aside className="bg-panel border border-line rounded-xl p-6 self-start">
                <h2 className="text-xl font-bold">{real ? 'Resumen del cobro' : 'Resumen de prueba'}</h2><p>{selection.length} vehículos seleccionados</p>
                <p className="text-xl font-bold my-4">Total: {formatMoney(total)} MXN</p>
                <button className="primary-button w-full" disabled={busy || !selection.length || !config?.habilitado} onClick={()=>setShowPayment(true)}>Continuar al pago</button>
                {!config?.habilitado && <p className="mt-3">El cobro está pendiente de configuración.</p>}
              </aside>
            </div>
          </>}
        </>}
        {tab==='pagos' && <div className="grid gap-4 md:grid-cols-2">
          <p role="status" className="md:col-span-2">{receiptStatus}</p>
          {!orders.length && <p>Aún no tienes pagos registrados.</p>}
          {orders.map(order=><article key={order.referencia} className="bg-panel border border-line p-6 rounded-xl">
            <h2 className="text-lg font-bold">{order.estado==='confirmado' && order.ambiente==='produccion' ? 'Pago confirmado' : stateLabels[order.estado]}</h2>
            <p>{order.ambiente==='produccion' ? 'Cobro real' : 'Sandbox'} · {order.estado==='confirmado'?'Completado':'Consulta el estado antes de pagar otra vez'}</p>
            <ul>{order.items.map((item,i)=><li key={i}>{item.marca} {item.modelo}</li>)}</ul>
            <p>{formatMoney(order.importe)} MXN · {new Date(order.creado_en).toLocaleString('es-MX')}</p>
            <p className="text-sm">Referencia: {order.referencia}</p>
            {order.metodo_pago && <p>Método: {order.metodo_pago}</p>}
            {order.confirmado_en && <p>Confirmado: {new Date(order.confirmado_en).toLocaleString('es-MX')}</p>}
            <Link className="inline-flex min-h-11 items-center underline" to={`/pago/${order.referencia}`}>Ver estado del pago</Link>
            {order.estado==='confirmado' && <button className="primary-button mt-3 w-full" disabled={Boolean(receiptRef)} onClick={()=>receipt(order.referencia)}>{receiptRef===order.referencia?'Preparando PDF…':'Descargar comprobante PDF'}</button>}
          </article>)}
        </div>}
      </>}
    </div>
    {showPayment && <AccessibleDialog title={real ? 'Confirmar importe del cobro' : 'Confirmar pago de prueba'} onClose={()=>!busy && setShowPayment(false)}>
      <form onSubmit={checkout} className="p-6 space-y-4" aria-busy={busy}>
        <p>{real ? `Se preparará un único cobro real por ${formatMoney(total)} MXN. No incluye entrega de vehículos. El importe definitivo se mostrará antes de autorizar el pago.` : `Vas a iniciar una operación de prueba por ${formatMoney(total)} MXN.`} Podrás pagar con tarjeta aquí o continuar en el checkout de Mercado Pago.</p>
        <button type="submit" className="primary-button w-full" disabled={busy}>{busy?'Creando orden…':real ? 'Crear orden' : 'Crear orden de prueba'}</button>
      </form>
    </AccessibleDialog>}
  </div>;
}
