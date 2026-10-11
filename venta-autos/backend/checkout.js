import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { assertCheckoutConfig } from './config.js';
import { createReceipt } from './receipt.js';
import { cents, money, requireValue, transaction, paymentState, validateRemote, webhookValidation, sealRequest, unsealRequest, buyerIdentification } from './core.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderIdPattern = /^ORD[A-Z0-9]+$/i;

export function createCheckout({ pool, config, mp, authenticate }) {
  const router = Router();

  async function findOrder(db, reference, userId, lock = false) {
    requireValue(uuid.test(reference || ''), 400, 'Referencia inválida.');
    const { rows } = await db.query(`SELECT * FROM ordenes WHERE referencia = $1 AND usuario_id = $2 ${lock ? 'FOR UPDATE' : ''}`, [reference, userId]);
    requireValue(rows.length, 404, 'Orden no encontrada.');
    return rows[0];
  }

  // Única función que confirma un pago, tanto desde webhook como desde consulta autenticada.
  // Bloquea la orden antes de consultar a MP: dos notificaciones concurrentes no se pisan.
  async function syncOrder(reference, userId) {
    return transaction(pool, async db => {
      const order = await findOrder(db, reference, userId, true);
      const payment = (await db.query('SELECT * FROM pagos WHERE orden_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE', [order.id])).rows[0];
      if (!payment?.mp_order_id) return;
      const remote = await mp.get(payment.mp_order_id);
      validateRemote(remote, order, payment, config);
      const updated = new Date(remote.last_updated_date || remote.created_date);
      requireValue(!Number.isNaN(updated.getTime()), 502, 'Fecha de Mercado Pago inválida.');
      if (payment.actualizado_mp_en && updated < new Date(payment.actualizado_mp_en)) return;
      const state = paymentState(remote);
      // No guardamos tokens de tarjeta ni respuestas completas del proveedor.
      const transactions = (remote.transactions?.payments || []).map(p => ({
        id: p.id, estado: p.status, detalle: p.status_detail, importe: p.amount,
        metodo: p.payment_method?.id, tipo: p.payment_method?.type,
      }));
      const paid = (remote.transactions?.payments || []).find(p => p.status === 'processed' && p.status_detail === 'accredited');
      const method = paid?.payment_method || {};
      await db.query(`UPDATE pagos SET estado_proveedor=$2, detalle_estado_proveedor=$3,
        mp_payment_id=COALESCE($4,mp_payment_id), metodo_pago=COALESCE($5,metodo_pago),
        tipo_pago=COALESCE($6,tipo_pago), cuotas=COALESCE($7,cuotas), transacciones=$8,
        confirmado_en=CASE WHEN $9 THEN COALESCE(confirmado_en,$10) ELSE confirmado_en END,
        actualizado_mp_en=$10, ultima_verificacion_en=NOW(), actualizado_en=NOW(),
        importe_reembolsado=CASE WHEN $11 THEN importe ELSE importe_reembolsado END
        WHERE id=$1`, [payment.id, remote.status, remote.status_detail, paid?.id || null,
        method.id || null, method.type || null, method.installments || null, JSON.stringify(transactions),
        state === 'confirmado', updated, state === 'reembolsado']);
      if (state === 'confirmado' && !order.pago_confirmado_en) {
        await db.query("UPDATE ordenes SET estado='pago_confirmado', pago_confirmado_en=$2, actualizado_en=NOW() WHERE id=$1", [order.id, updated]);
        await db.query(`DELETE FROM apartados WHERE usuario_id=$2 AND id IN
          (SELECT apartado_id FROM orden_detalles WHERE orden_id=$1)`, [order.id, userId]);
        // Sandbox no representa una venta real: no descuenta stock ni incrementa compras_totales.
        // Habilitar producción exige implementar reserva/entrega de inventario y aprobar precios.
      }
    });
  }

  async function orderView(reference, userId) {
    const order = await findOrder(pool, reference, userId);
    const payment = (await pool.query(`SELECT ambiente, estado_proveedor, detalle_estado_proveedor,
      mp_order_id, mp_payment_id, metodo_pago, confirmado_en, ultima_verificacion_en, transacciones,
      (solicitud_mp IS NOT NULL) AS solicitud_guardada
      FROM pagos WHERE orden_id=$1 ORDER BY id DESC LIMIT 1`, [order.id])).rows[0];
    const items = (await pool.query('SELECT marca, modelo, anio, cantidad, precio_unitario, subtotal FROM orden_detalles WHERE orden_id=$1 ORDER BY id', [order.id])).rows;
    const state = order.estado === 'cancelada' ? 'cancelado' : payment?.estado_proveedor ? paymentState({ status: payment.estado_proveedor, status_detail: payment.detalle_estado_proveedor }) : 'pendiente';
    return { referencia: order.referencia, estado: state, ambiente: payment?.ambiente,
      importe: order.importe_a_cobrar, moneda: order.moneda, creado_en: order.creado_en,
      confirmado_en: payment?.confirmado_en, metodo_pago: payment?.metodo_pago,
      mp_order_id: payment?.mp_order_id, mp_payment_id: payment?.mp_payment_id, items,
      detalle_pago: payment?.transacciones?.find(p => p.estado === 'failed')?.detalle,
      puede_recuperar: order.estado === 'pendiente' && !!payment?.solicitud_guardada && !payment.mp_order_id,
      puede_cancelar: !order.pago_confirmado_en && order.estado === 'pendiente' && !payment?.solicitud_guardada
        && (!payment?.mp_order_id || ['rechazado','cancelado'].includes(state)),
      puede_continuar: !order.pago_confirmado_en && order.estado === 'pendiente' && ['pendiente','rechazado','cancelado'].includes(state),
    };
  }

  async function submitPayment(reference, userId, form) {
    assertCheckoutConfig(config);
    await mp.assertTestSeller();
    // Consulta un intento existente antes de decidir si puede crearse otro.
    await syncOrder(reference, userId);
    await transaction(pool, async db => {
      const order = await findOrder(db, reference, userId, true);
      requireValue(!order.pago_confirmado_en && order.estado === 'pendiente', 409, 'Esta orden ya no admite pagos.');
      let payment = (await db.query('SELECT * FROM pagos WHERE orden_id=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE', [order.id])).rows[0];
      if (payment.mp_order_id || payment.detalle_estado_proveedor === 'solicitud_rechazada') {
        requireValue(['rechazado','cancelado'].includes(paymentState({status:payment.estado_proveedor})),409,'El intento anterior aún puede cobrar. Actualiza su estado.');
        payment = (await db.query(`INSERT INTO pagos(orden_id,ambiente,clave_idempotencia,importe)
          VALUES($1,'prueba',$2,$3) RETURNING *`,[order.id,randomUUID(),order.importe_a_cobrar])).rows[0];
      }
      if (payment.solicitud_mp) return; // Respuesta perdida: conserva token, cuerpo y clave originales.
      requireValue(typeof form?.token === 'string' && /^[a-zA-Z0-9_-]{10,256}$/.test(form.token),400,'Token de tarjeta inválido.');
      requireValue(typeof form.payment_method_id === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(form.payment_method_id)
        && ['credit_card','debit_card'].includes(form.payment_type_id) && form.installments === 1,400,'Selecciona una tarjeta y un solo pago.');
      requireValue(form.payer?.email === config.buyerEmail,400,'Utiliza el correo del comprador de prueba configurado.');
      const identification = buyerIdentification(form.payer.identification);
      const details=(await db.query('SELECT marca,modelo,cantidad,precio_unitario FROM orden_detalles WHERE orden_id=$1 ORDER BY id',[order.id])).rows;
      // El importe procede exclusivamente de PostgreSQL. El Brick solo entrega un token temporal.
      const body={type:'online',processing_mode:'automatic',capture_mode:'automatic',external_reference:order.referencia,
        total_amount:money(cents(order.importe_a_cobrar)),payer:{email:config.buyerEmail,...(identification ? {identification} : {})},
        transactions:{payments:[{amount:money(cents(order.importe_a_cobrar)),payment_method:{id:form.payment_method_id,
          type:form.payment_type_id,token:form.token,installments:1}}]},
        items:details.map(item=>({title:`Prueba: ${item.marca} ${item.modelo}`,quantity:item.cantidad,unit_price:money(cents(item.precio_unitario))}))};
      await db.query('UPDATE pagos SET solicitud_mp=$2,actualizado_en=NOW() WHERE id=$1',[payment.id,JSON.stringify(sealRequest(body,config.authSecret))]);
    });
    // El COMMIT anterior conserva la idempotencia incluso si el proceso se interrumpe durante POST.
    const failure=await transaction(pool,async db=> {
      const order=await findOrder(db,reference,userId,true);
      const payment=(await db.query('SELECT * FROM pagos WHERE orden_id=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE',[order.id])).rows[0];
      if(payment.mp_order_id) return; // Otra pestaña terminó el mismo intento.
      requireValue(payment.solicitud_mp,409,'Falta preparar el intento.');
      let remote;
      try {remote=await mp.create(unsealRequest(payment.solicitud_mp,config.authSecret),payment.clave_idempotencia);}
      catch(error) {
        if(!error.definitive) throw error; // Timeout: nunca inventar rechazo ni otra clave.
        await db.query("UPDATE pagos SET estado_proveedor='failed',detalle_estado_proveedor='solicitud_rechazada',solicitud_mp=NULL WHERE id=$1",[payment.id]);
        return error;
      }
      requireValue(orderIdPattern.test(remote.id || '') && remote.external_reference===order.referencia,502,'Respuesta de creación inválida.');
      // Guarda el ID incluso si el resultado es rechazado (HTTP 402). La confirmación usa GET.
      await db.query('UPDATE pagos SET mp_order_id=$2,solicitud_mp=NULL,actualizado_en=NOW() WHERE id=$1',[payment.id,remote.id]);
    });
    if(failure) throw failure;
    await syncOrder(reference,userId);
    return orderView(reference,userId);
  }

  router.get('/config', (_req, res) => {
    res.json({ ambiente: 'prueba', precio_prueba: config.testUnitPrice, habilitado: config.enabled,
      comprador_prueba_email: config.buyerEmail });
  });

  router.post('/webhook', async (req, res) => {
    // Visible en Render > Logs: permite distinguir falta de headers, firma y procesamiento.
    // No registrar req.body, req.headers, tokens, claves ni datos de tarjeta.
    const started = Date.now();
    const queryId = req.query['data.id'];
    const bodyId = req.body?.data?.id;
    const diagnostic = {
      evento: 'mercadopago_webhook',
      data_id_url_presente: typeof queryId === 'string' && !!queryId,
      data_id_url_valido: typeof queryId === 'string' && orderIdPattern.test(queryId),
      data_id_cuerpo_presente: typeof bodyId === 'string' && !!bodyId,
      ids_coinciden: typeof queryId === 'string' && typeof bodyId === 'string'
        && queryId.toLowerCase() === bodyId.toLowerCase(),
      x_signature_presente: !!req.get('x-signature'),
      x_request_id_presente: !!req.get('x-request-id'),
    };
    const validation = webhookValidation({ signature: req.get('x-signature'),
      requestId: req.get('x-request-id'), dataId: queryId, secret: config.webhookSecret });
    res.on('finish', () => console.info(JSON.stringify({ ...diagnostic,
      validacion: validation.reason, http: res.statusCode, duracion_ms: Date.now() - started })));
    requireValue(config.webhookSecret, 503, 'Falta configurar el webhook.');
    const id = queryId;
    requireValue(diagnostic.data_id_url_valido && validation.valid, 401, 'Firma inválida.');
    requireValue(String(req.body?.data?.id).toLowerCase() === id.toLowerCase(), 400, 'ID inconsistente.');
    if (!['order', 'orders_v2'].includes(req.body.type)) return res.sendStatus(200);
    requireValue(req.body.live_mode !== true, 400, 'Solo se aceptan eventos de prueba.');
    // Solo consultamos órdenes locales conocidas; el cuerpo no puede marcar una orden pagada.
    const { rows } = await pool.query(`SELECT o.referencia, o.usuario_id FROM ordenes o
      JOIN pagos p ON p.orden_id=o.id WHERE lower(p.mp_order_id)=lower($1)`, [id]);
    // Puede llegar antes de que el POST de creación haya persistido el ID: pedimos reintento.
    requireValue(rows.length, 503, 'Orden aún no registrada.');
    await syncOrder(rows[0].referencia, rows[0].usuario_id);
    res.sendStatus(200); // Respondemos después del COMMIT; ante fallo MP debe reintentar.
  });

  router.use(authenticate);
  router.post('/ordenes', async (req, res) => {
    assertCheckoutConfig(config);
    const ids = req.body.apartados_ids;
    const reference = typeof req.body.referencia === 'string' ? req.body.referencia.toLowerCase() : '';
    requireValue(uuid.test(reference || ''), 400, 'Falta una referencia válida para evitar duplicados.');
    requireValue(Array.isArray(ids) && ids.length > 0 && ids.length <= 20 && ids.every(Number.isSafeInteger)
      && ids.every(x => x > 0) && new Set(ids).size === ids.length, 400, 'Selección de vehículos inválida.');
    const result = await transaction(pool, async db => {
      // Serializa los checkouts del mismo usuario incluso entre pestañas y referencias distintas.
      await db.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [req.user.id]);
      const existing = (await db.query('SELECT * FROM ordenes WHERE referencia=$1', [reference])).rows[0];
      if (existing) {
        requireValue(existing.usuario_id === req.user.id, 409, 'Referencia no disponible.');
        return { referencia: reference };
      }
      const active = await db.query(`SELECT DISTINCT o.referencia FROM ordenes o
        JOIN orden_detalles d ON d.orden_id=o.id
        WHERE o.usuario_id=$1 AND o.estado='pendiente' AND d.apartado_id=ANY($2::int[])`, [req.user.id, ids]);
      if (active.rows.length) return { referencia: active.rows[0].referencia, existente: true };
      const { rows: cars } = await db.query(`SELECT a.id AS apartado_id, v.* FROM apartados a
        JOIN vehiculos v ON v.id=a.vehiculo_id WHERE a.usuario_id=$1 AND a.status='apartado'
        AND a.id=ANY($2::int[]) ORDER BY v.id FOR UPDATE OF a,v`, [req.user.id, ids]);
      requireValue(cars.length === ids.length && cars.every(car => car.stock > 0), 409, 'Revisa tu carrito: faltan vehículos o existencias.');
      const total = money(cents(config.testUnitPrice) * cars.length);
      const order = (await db.query(`INSERT INTO ordenes
        (usuario_id,referencia,concepto,total_vehiculos,importe_a_cobrar,comprador_nombre,comprador_email,comprador_telefono)
        VALUES ($1,$2,'compra',$3,$3,$4,$5,$6) RETURNING *`,
        [req.user.id, reference, total, req.user.nombre, req.user.email, req.user.telefono])).rows[0];
      for (const car of cars) await db.query(`INSERT INTO orden_detalles
        (orden_id,vehiculo_id,apartado_id,marca,modelo,anio,precio_unitario)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [order.id, car.id, car.apartado_id, car.marca, car.modelo, car.anio, config.testUnitPrice]);
      // Persistir ANTES de llamar a MP conserva la idempotencia ante caídas de red o servidor.
      await db.query(`INSERT INTO pagos (orden_id,ambiente,clave_idempotencia,importe)
        VALUES ($1,'prueba',$2,$3)`, [order.id, randomUUID(), total]);
      return { referencia: reference };
    });
    res.status(201).json(result);
  });
  router.post('/ordenes/:referencia/pagar', async (req, res) => {
    res.json(await submitPayment(req.params.referencia, req.user.id,req.body));
  });
  router.post('/ordenes/:referencia/sincronizar', async (req, res) => {
    assertCheckoutConfig(config);
    await syncOrder(req.params.referencia, req.user.id);
    res.json(await orderView(req.params.referencia, req.user.id));
  });
  router.get('/ordenes/:referencia', async (req, res) => res.json(await orderView(req.params.referencia, req.user.id)));
  router.get('/ordenes/:referencia/comprobante', async (req, res) => {
    // La sesión y el propietario se validan en el servidor, aunque alguien copie la URL.
    // Descargar NO crea ni reintenta pagos. Solo acepta un pago acreditado ya verificado.
    const receipt = await transaction(pool, async db => {
      const order = await findOrder(db, req.params.referencia, req.user.id, true);
      requireValue(order.estado === 'pago_confirmado' && order.pago_confirmado_en, 409, 'El comprobante requiere un pago confirmado.');
      const payment = (await db.query(`SELECT ambiente, estado_proveedor, detalle_estado_proveedor,
        importe, moneda, metodo_pago, tipo_pago, cuotas, tarjeta_ultimos_cuatro,
        mp_order_id, mp_payment_id, confirmado_en FROM pagos
        WHERE orden_id=$1 ORDER BY id DESC LIMIT 1`, [order.id])).rows[0];
      requireValue(payment && payment.ambiente === 'prueba' && payment.estado_proveedor === 'processed'
        && payment.detalle_estado_proveedor === 'accredited' && payment.confirmado_en
        && payment.mp_order_id && payment.mp_payment_id && payment.moneda === order.moneda
        && cents(payment.importe) === cents(order.importe_a_cobrar), 409, 'El pago no tiene una acreditación válida para este comprobante.');
      const items = (await db.query(`SELECT marca, modelo, anio, cantidad, precio_unitario, subtotal
        FROM orden_detalles WHERE orden_id=$1 ORDER BY id`, [order.id])).rows;
      requireValue(items.length, 409, 'Faltan los vehículos de la orden.');
      return { order, payment, items };
    });
    const pdf = await createReceipt(receipt);
    res.set({ 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprobante-prueba-${receipt.order.referencia}.pdf"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(pdf);
  });
  router.post('/ordenes/:referencia/cancelar', async (req,res)=> {
    // Abandonar solo un borrador o un intento rechazado/cancelado, confirmado mediante GET.
    // Un timeout o pago pendiente puede cobrar: no liberarlo por decisión del navegador.
    await syncOrder(req.params.referencia,req.user.id);
    await transaction(pool,async db=> {
      const order=await findOrder(db,req.params.referencia,req.user.id,true);
      requireValue(!order.pago_confirmado_en,409,'Una orden pagada no puede abandonarse.');
      const payment=(await db.query('SELECT * FROM pagos WHERE orden_id=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE',[order.id])).rows[0];
      requireValue(!payment.solicitud_mp && (!payment.mp_order_id || ['rechazado','cancelado'].includes(paymentState({status:payment.estado_proveedor}))),409,'El pago aún puede procesarse. Consulta su estado antes de cancelar.');
      await db.query("UPDATE ordenes SET estado='cancelada',actualizado_en=NOW() WHERE id=$1",[order.id]);
    });
    res.json({success:true});
  });
  router.get('/ordenes', async (req, res) => {
    const { rows } = await pool.query('SELECT referencia FROM ordenes WHERE usuario_id=$1 ORDER BY creado_en DESC LIMIT 50', [req.user.id]);
    res.json(await Promise.all(rows.map(row => orderView(row.referencia, req.user.id))));
  });
  return router;
}
