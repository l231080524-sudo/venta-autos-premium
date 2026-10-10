import AccessibleDialog from '../components/AccessibleDialog';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Carrito({ usuario, setModalAuth, actualizarConteoCarrito }) {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [items, setItems] = useState([]);
  const [comprasRealizadas, setComprasRealizadas] = useState([]);
  const [tabActiva, setTabActiva] = useState('carrito');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showPayment, setShowPayment] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState(null);

  useEffect(() => {
    if (!usuario) {
      return;
    }

    const fetchDatos = async () => {
      try {
        // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
        const response = await fetch(`${API_URL}/api/apartados?usuario_id=${usuario.id}`);
        if (!response.ok) throw new Error('Error al conectar con el servidor.');
        const data = await response.json();
        setItems(data);
        setSelectedIds(data.map(item => item.id));

        const historialLocal = localStorage.getItem(`compras_${usuario.id}`);
        if (historialLocal) {
          setComprasRealizadas(JSON.parse(historialLocal));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [usuario, API_URL]);

  // 2. ELIMINAR APARTADO
  const eliminarApartado = async (apartadoId) => {
    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados/${apartadoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar el apartado.');
      setItems(items.filter(item => item.id !== apartadoId));
      setSelectedIds(selectedIds.filter(id => id !== apartadoId));

      // Actualizar el "globito" rojo global de la aplicación
      if (actualizarConteoCarrito) actualizarConteoCarrito();
    } catch (err) {
      alert("Error al eliminar del carrito: " + err.message);
    }
  };

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((acc, curr) => acc + Number(curr.precio), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // 3. PROCESAR PAGO Y MOVER A "COMPRAS REALIZADAS"
  const procesarPago = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    const mostExpensive = [...selectedItems].sort((a, b) => Number(b.precio) - Number(a.precio))[0];
    const mainCategory = mostExpensive?.categoria || 'gasolina';

    try {
      // 🚀 SE REEMPLAZÓ LOCALHOST AQUÍ
      const response = await fetch(`${API_URL}/api/apartados/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id, apartados_ids: selectedIds })
      });

      if (!response.ok) throw new Error('Fallo en el servidor al registrar el pago.');

      // Generar la Factura
      const nuevaCompra = {
        // Event handler only: this value is generated after the payment request, never during rendering.
        // eslint-disable-next-line react-hooks/purity
        idTransaccion: 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
        cliente: usuario?.nombre || 'Cliente Premium CDMX',
        items: selectedItems,
        subtotal, iva, total,
        tema: mainCategory
      };

      // Guardar en el historial
      const nuevoHistorial = [nuevaCompra, ...comprasRealizadas];
      setComprasRealizadas(nuevoHistorial);
      localStorage.setItem(`compras_${usuario.id}`, JSON.stringify(nuevoHistorial));

      // Limpiar carrito actual
      setItems(items.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      setShowPayment(false);

      // Actualizar el contador global de la aplicación
      if (actualizarConteoCarrito) actualizarConteoCarrito();

      // Mostrar la factura recién creada y cambiar de pestaña
      setReceiptToPrint(nuevaCompra);
      setTabActiva('compras');

    } catch (err) {
      alert("Error al procesar la transacción: " + err.message);
    }
  };

  // Función para abrir el PDF
  const imprimirPDF = (compra) => {
    setReceiptToPrint(compra);
    setTimeout(() => window.print(), 200);
  };

  // Tema de la factura
  const getReceiptTheme = (tema) => {
    switch (tema) {
      case 'superdeportivo': return { border: 'border-line', text: 'text-content', bg: 'bg-panel' };
      case 'electrico': return { border: 'border-line', text: 'text-content', bg: 'bg-panel' };
      case 'hibrido': return { border: 'border-line', text: 'text-content', bg: 'bg-panel' };
      default: return { border: 'border-line', text: 'text-content', bg: 'bg-panel' };
    }
  };

  return (
    <div className="min-h-screen bg-surface text-content font-ui selection:bg-panel pb-24">

      <div className="print:hidden">


        <div className="pt-12 px-6 md:px-12 max-w-7xl min-w-0 mx-auto">
          <div className="mb-8">
            <span className="text-sm uppercase font-extrabold tracking-normal text-muted block mb-1">Tu perfil financiero</span>
            <h1 className="heading-large font-black tracking-normal uppercase">PANEL <span className="text-muted">CLIENTE</span></h1>
            <div className="w-16 h-1 bg-panel mt-4 rounded-full"></div>
          </div>

          {error && <p role="alert" className="p-4 border rounded mb-6">{error}</p>}
          {!usuario ? (
            <div className="bg-panel border border-line rounded-2xl p-16 text-center shadow-2xl">
              <span className="heading-large block mb-6">🔒</span>
              <h2 className="text-2xl font-bold mb-4">Acceso Restringido</h2>
              <p className="text-muted mb-8 max-w-md mx-auto">Para ver o pagar tus reservas, primero debes iniciar sesión.</p>
              <button onClick={() => setModalAuth({ abierto: true, modoRegistro: false })} className="bg-surface text-content font-bold uppercase tracking-normal px-8 py-4 rounded hover:bg-panel transition">Iniciar Sesión</button>
            </div>
          ) : loading ? (
            <div role="status" className="flex flex-col justify-center items-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-line border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted text-sm tracking-normal uppercase font-bold">Consultando base de datos...</p>
            </div>
          ) : (
            <>
              {/* TABS DE NAVEGACIÓN */}
              <div className="flex flex-wrap gap-4 mb-8 border-b border-line pb-4 overflow-x-auto">
                <button
                  aria-pressed={tabActiva === "carrito"} onClick={() => setTabActiva('carrito')}
                  className={`px-6 py-3 font-bold tracking-normal uppercase rounded-lg  whitespace-normal ${tabActiva === 'carrito' ? 'bg-panel text-content' : 'text-muted hover:text-content'}`}
                >
                  🛒 En Carrito ({items.length})
                </button>
                <button
                  aria-pressed={tabActiva === "compras"} onClick={() => setTabActiva('compras')}
                  className={`px-6 py-3 font-bold tracking-normal uppercase rounded-lg  whitespace-normal ${tabActiva === 'compras' ? 'bg-panel text-content border border-line' : 'text-muted hover:text-content'}`}
                >
                  ✅ Compras Realizadas ({comprasRealizadas.length})
                </button>
              </div>

              <h2 className="sr-only">{tabActiva === 'carrito' ? 'Vehículos en el carrito' : 'Compras realizadas'}</h2>
              {/* PESTAÑA: CARRITO */}
              {tabActiva === 'carrito' && (
                items.length === 0 ? (
                  <div className="bg-panel border border-line rounded-2xl p-16 text-center shadow-2xl mt-10">
                    <span className="heading-large block mb-6">🏎️</span>
                    <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
                    <p className="text-muted mb-8 max-w-md mx-auto">No tienes vehículos pendientes de pago. Visita el catálogo para apartar.</p>
                    <button onClick={() => navigate('/catalogo')} className="bg-surface text-content font-bold uppercase tracking-normal px-8 py-4 rounded hover:bg-panel transition">Ir al Catálogo</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-panel p-4 rounded-xl border border-line flex flex-wrap gap-3 justify-between items-center">
                        <span className="text-sm uppercase tracking-normal text-muted font-bold">Seleccionados para Liquidar ({selectedItems.length})</span>
                        <button onClick={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i=>i.id))} className="text-sm text-content hover:text-content transition">
                          {selectedIds.length === items.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                      </div>

                      {items.map(item => (
                        <div key={item.id} className={`flex flex-col md:flex-row bg-panel border rounded-2xl overflow-hidden   ${selectedIds.includes(item.id) ? 'border-line ' : 'border-line '}`}>
                          <div className="flex items-center p-4 md:w-1/3 bg-surface">
                            <input aria-label={`Seleccionar ${item.marca} ${item.modelo}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} className="w-5 h-5 accent-blue-600 mr-4 cursor-pointer" />
                            <div className="w-full h-24 rounded-lg overflow-hidden relative">
                              <img src={item.imagen} alt={item.modelo} className="w-full h-full object-cover"/>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col justify-between">
                            <div className="flex flex-col md:flex-row md:justify-between items-start gap-3">
                              <div>
                                <span className="text-sm uppercase tracking-normal text-muted block mb-1">{item.categoria}</span>
                                <h3 className="text-xl font-bold">{item.marca} <span className="font-normal">{item.modelo}</span></h3>
                              </div>
                              <button aria-label={`Eliminar del carrito ${item.marca} ${item.modelo}`} onClick={() => { if (window.confirm(`¿Eliminar ${item.marca} ${item.modelo} del carrito?`)) eliminarApartado(item.id); }} className="text-sm text-content hover:text-content transition uppercase tracking-normal font-bold">
                                Eliminar del carrito
                              </button>
                            </div>
                            <div className="text-right mt-4 md:mt-0">
                              <span className="text-sm uppercase text-muted tracking-normal block mb-1">Precio Unitario</span>
                              <span className="text-xl font-ui font-bold">${Number(item.precio).toLocaleString('es-MX')} <span className="text-sm">MXN</span></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Panel Financiero */}
                    <div className="lg:col-span-1">
                      <div className="bg-panel border border-line rounded-2xl p-8 shadow-2xl">
                        <h3 className="text-lg font-bold uppercase tracking-normal mb-6 border-b border-line pb-4">Detalles de la Compra</h3>
                        <div className="space-y-4 mb-8 text-sm">
                          <div className="flex flex-wrap gap-3 justify-between text-muted"><span>Subtotal</span><span className="font-ui text-content">${subtotal.toLocaleString('es-MX')}</span></div>
                          <div className="flex flex-wrap gap-3 justify-between text-muted"><span>IVA (16%)</span><span className="font-ui text-content">${iva.toLocaleString('es-MX')}</span></div>
                          <div className="flex flex-wrap gap-3 justify-between text-muted"><span>Traslado</span><span className="font-ui text-content font-bold uppercase text-sm">Sin costo</span></div>
                        </div>
                        <div className="border-t border-line pt-6 mb-8">
                          <div className="flex flex-wrap gap-3 justify-between items-end">
                            <span className="text-sm uppercase tracking-normal text-muted font-bold">Total Final</span>
                            <span className="text-3xl font-ui font-black text-content">${total.toLocaleString('es-MX')}</span>
                          </div>
                        </div>
                        <button disabled={selectedItems.length === 0} onClick={() => setShowPayment(true)} className={`w-full py-4 rounded font-black uppercase tracking-normal  ${selectedItems.length > 0 ? 'bg-surface text-content hover:bg-panel' : 'bg-panel text-muted cursor-not-allowed'}`}>
                          Liquidar Selección
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* PESTAÑA: COMPRAS REALIZADAS */}
              {tabActiva === 'compras' && (
                comprasRealizadas.length === 0 ? (
                  <div className="text-center py-24 bg-panel border border-line rounded-2xl">
                    <span className="heading-large block mb-4">🧾</span>
                    <h3 className="text-xl font-bold mb-2">Aún no tienes compras</h3>
                    <p className="text-muted">Aquí aparecerán tus facturas cuando liquides un vehículo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {comprasRealizadas.map((compra, idx) => (
                      <div key={idx} className="bg-panel border border-line p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap gap-3 justify-between items-start mb-4 border-b border-line pb-4">
                            <div>
                              <span className="text-sm text-content uppercase tracking-normal font-black">Pagado y Liquidado</span>
                              <h3 className="font-bold text-content text-lg mt-1">{compra.idTransaccion}</h3>
                            </div>
                            <span className="text-sm text-muted">{compra.fecha.split(',')[0]}</span>
                          </div>
                          <ul className="mb-6 space-y-2">
                            {compra.items.map((item, i) => (
                              <li key={i} className="text-sm text-content flex flex-wrap gap-3 justify-between">
                                <span>{item.marca} {item.modelo}</span>
                                <span className="font-ui text-muted">${Number(item.precio).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between border-t border-line pt-4">
                          <div>
                            <span className="text-sm uppercase text-muted block">Total</span>
                            <span className="font-ui font-bold text-xl">${compra.total.toLocaleString()}</span>
                          </div>
                          <button onClick={() => imprimirPDF(compra)} className="bg-panel text-content hover:bg-panel hover:text-content border border-line px-4 py-2 rounded text-sm uppercase tracking-normal font-bold transition">
                            Ver PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* ==========================================
            MODAL DE PAGO
            ========================================== */}
        {showPayment && (
          <AccessibleDialog title="Simulación de pago" onClose={() => setShowPayment(false)}>
              <form onSubmit={procesarPago} className="p-8 space-y-5">
                <div className="bg-panel border border-line p-4 rounded-lg flex items-start gap-3">
                  <span className="text-content text-lg">🛡️</span>
                  <p className="text-sm text-content leading-relaxed uppercase tracking-normal font-semibold">
                    Simulación de pasarela. Usa solo datos de prueba. No se realiza ningún cobro bancario.
                  </p>
                </div>

                {/* Nombre */}
                <div>
                  <label htmlFor="pago-nombre" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Nombre del Titular</label>
                  <input id="pago-nombre" autoComplete="cc-name" required type="text" placeholder="Ej. Hugo Becerra" className="w-full bg-surface border border-line rounded-lg p-3 text-sm focus:border-line"/>
                </div>

                {/* Tarjeta */}
                <div>
                  <label htmlFor="pago-tarjeta" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Número de Tarjeta</label>
                  <input id="pago-tarjeta" autoComplete="cc-number" required type="text" placeholder="4152 3162 0000 0000" maxLength="19" className="w-full bg-surface border border-line rounded-lg p-3 text-sm font-ui focus:border-line"/>
                </div>

                {/* Caducidad y CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pago-fecha" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Fecha de Caducidad</label>
                  <input id="pago-fecha" autoComplete="cc-exp" required type="text" placeholder="MM/AA" maxLength="5" className="w-full bg-surface border border-line rounded-lg p-3 text-sm font-ui focus:border-line"/>
                  </div>
                  <div>
                    <label htmlFor="pago-cvc" className="block text-sm uppercase tracking-normal text-muted font-bold mb-1.5">Código CVC</label>
                  <input id="pago-cvc" autoComplete="cc-csc" required type="password" placeholder="***" maxLength="4" className="w-full bg-surface border border-line rounded-lg p-3 text-sm font-ui focus:border-line"/>
                  </div>
                </div>

                <button type="submit" className="w-full bg-panel hover:bg-panel text-content font-bold uppercase tracking-normal py-4 rounded-lg mt-2">
                  Confirmar Pago (${total.toLocaleString('es-MX')})
                </button>
              </form>
          </AccessibleDialog>
        )}

      </div>

      {/* VISTA EXCLUSIVA DE IMPRESIÓN (PDF DINÁMICO) */}
      {receiptToPrint && (
        <div className={`hidden print:block min-h-screen p-10 font-ui ${getReceiptTheme(receiptToPrint.tema).bg}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className={`border-b-4 pb-6 mb-8 flex flex-wrap gap-3 justify-between items-end ${getReceiptTheme(receiptToPrint.tema).border}`}>
            <div>
              <h1 className={`text-3xl font-black tracking-normal uppercase ${getReceiptTheme(receiptToPrint.tema).text}`}>
                AUTOPREMIUM <span className="text-content text-sm font-bold">CDMX</span>
              </h1>
              <p className="text-sm text-muted font-bold tracking-normal mt-1 uppercase">Factura de Adquisición Digital</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-muted">Folio: <span className="font-ui">{receiptToPrint.idTransaccion}</span></p>
              <p className="text-sm text-muted">{receiptToPrint.fecha}</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm uppercase tracking-normal text-muted font-bold mb-1">Cliente Adquirente</h3>
            <p className="text-lg font-extrabold text-muted">{receiptToPrint.cliente}</p>
          </div>

          <div className="mb-10">
            <h3 className="text-sm uppercase tracking-normal text-muted font-bold mb-3 border-b border-line pb-1">Unidades Liquidadas</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm uppercase tracking-normal text-muted border-b border-line">
                  <th className="py-3">Descripción</th>
                  <th className="py-3">Categoría de Ingeniería</th>
                  <th className="py-3 text-right">Importe Comercial</th>
                </tr>
              </thead>
              <tbody>
                {receiptToPrint.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-line">
                    <td className="py-4 font-bold text-muted">{item.marca} <span className="font-normal">{item.modelo}</span></td>
                    <td className="py-4 text-sm uppercase text-muted font-medium">{item.categoria}</td>
                    <td className="py-4 text-right font-ui font-bold text-muted">${Number(item.precio).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-1/2 ml-auto space-y-2">
            <div className="flex flex-wrap gap-3 justify-between py-1 text-sm text-muted">
              <span>Subtotal</span><span className="font-ui">${receiptToPrint.subtotal.toLocaleString('es-MX')}</span>
            </div>
            <div className="flex flex-wrap gap-3 justify-between py-1 text-sm text-muted border-b border-line">
              <span>I.V.A. Trasladado (16%)</span><span className="font-ui">${receiptToPrint.iva.toLocaleString('es-MX')}</span>
            </div>
            <div className={`flex flex-wrap gap-3 justify-between py-3 text-xl font-black ${getReceiptTheme(receiptToPrint.tema).text}`}>
              <span>TOTAL</span><span className="font-ui">${receiptToPrint.total.toLocaleString('es-MX')} MXN</span>
            </div>
          </div>
          <div className="mt-20 text-center border-t border-line pt-8">
            <p className="text-sm uppercase tracking-normal text-muted mb-1 font-bold">Este comprobante certifica la adjudicación del activo.</p>
            <p className="text-sm text-muted font-ui">AutoPremium CDMX Showroom | Av. Telecomunicaciones, CDMX.</p>
          </div>
        </div>
      )}
    </div>
  );
}
