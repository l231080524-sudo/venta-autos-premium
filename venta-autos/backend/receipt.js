import PDFDocument from 'pdfkit';
import { cents, money } from './core.js';

const currency = value => `${Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} MXN`;
const date = value => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Mexico_City',
}).format(new Date(value));

// Recibe exclusivamente columnas seleccionadas del servidor. Nunca tokens ni respuesta cruda de MP.
// No requiere claves adicionales: identidad, importes y vehículos proceden del histórico en PostgreSQL.
export async function createReceipt({ order, payment, items }, issuedAt = new Date()) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true,
    tagged: true, lang: 'es-MX', displayTitle: true,
    info: { Title: 'AutoPremium - Comprobante de prueba', Author: 'AutoPremium CDMX', CreationDate: issuedAt },
  });
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const root = doc.struct('Document');
  doc.addStructure(root);
  const width = doc.page.width - 96;
  let y = 48;
  function room(height) {
    if (y + height > doc.page.height - 76) { doc.addPage(); y = 48; }
  }
  function text(value, { size = 10.5, bold = false, color = '#15334D', tag = 'P', gap = 6 } = {}) {
    // El contenido sigue el mismo orden visual y de lectura para lectores de pantalla.
    const content = String(value ?? 'No registrado').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const height = doc.heightOfString(content, { width, lineGap: 2 });
    room(height + gap);
    const top = y;
    root.add(doc.struct(tag, () => doc.fillColor(color).text(content, 48, top, { width, lineGap: 2 })));
    y += height + gap;
  }
  function section(title) {
    room(60); y += 6;
    doc.save().strokeColor('#B4CADD').moveTo(48, y).lineTo(48 + width, y).stroke().restore();
    y += 10;
    text(title, { size: 13, bold: true, tag: 'H2' });
  }
  text('AutoPremium CDMX', { size: 24, bold: true, tag: 'H1' });
  text('COMPROBANTE DE PRUEBA - SANDBOX', { size: 14, bold: true });
  text('Operación simulada. No representa un cobro real ni una factura fiscal.', { bold: true });
  text(`Referencia de la orden: ${order.referencia}`, { size: 10 });
  text(`Emitido: ${date(issuedAt)}`);
  section('Comprador');
  text(`Nombre: ${order.comprador_nombre}`);
  text(`Correo: ${order.comprador_email}`);
  text(`Teléfono: ${order.comprador_telefono || 'No registrado'}`);
  section('Vehículos');
  for (const [index, item] of items.entries()) {
    room(95);
    text(`${index + 1}. ${item.marca} ${item.modelo}`, { bold: true });
    text(`Año: ${item.anio} | Cantidad: ${item.cantidad}`);
    text(`Precio unitario de prueba: ${currency(item.precio_unitario)} | Subtotal: ${currency(item.subtotal)}`);
  }
  section('Importes de la orden');
  text(`Concepto: ${order.concepto === 'anticipo' ? 'Anticipo' : 'Compra de prueba'}`);
  text(`Total registrado: ${currency(order.total_vehiculos)}`);
  text(`Importe confirmado: ${currency(payment.importe)}`, { size: 14, bold: true });
  const balance = money(Math.max(0, cents(order.total_vehiculos) - cents(payment.importe)));
  text(`Saldo pendiente de esta orden: ${currency(balance)}`);
  text('Los importes de Sandbox son de prueba; no corresponden al precio comercial del vehículo.', { size: 10 });
  section('Pago confirmado');
  text('Proveedor: Mercado Pago | Ambiente: Prueba');
  text(`Estado: Acreditado (${payment.estado_proveedor} / ${payment.detalle_estado_proveedor})`);
  const method = { master: 'Mastercard', visa: 'Visa', amex: 'American Express' }[payment.metodo_pago] || payment.metodo_pago || 'No registrado';
  const type = { credit_card: 'Tarjeta de crédito', debit_card: 'Tarjeta de débito' }[payment.tipo_pago] || payment.tipo_pago || 'No registrado';
  text(`Método: ${method} | Tipo: ${type}`);
  text(`Cuotas: ${payment.cuotas || 'No registrado'}`);
  if (payment.tarjeta_ultimos_cuatro) text(`Tarjeta terminada en: ${payment.tarjeta_ultimos_cuatro}`);
  text(`Confirmación: ${date(payment.confirmado_en)} (Ciudad de México)`);
  text(`Orden Mercado Pago: ${payment.mp_order_id}`, { size: 10 });
  text(`Transacción Mercado Pago: ${payment.mp_payment_id}`, { size: 10 });
  text('Este comprobante usa los datos históricos del pago confirmado. No acredita propiedad ni entrega del vehículo.', { size: 10 });
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    // El pie está fuera del área principal: evitar que PDFKit cree páginas extra al dibujarlo.
    doc.page.margins.bottom = 0;
    doc.markContent('Artifact');
    doc.font('Helvetica').fontSize(9).fillColor('#15334D')
      .text(`AutoPremium CDMX | Sandbox | Página ${i + 1} de ${pages.count}`, 48, doc.page.height - 48,
        { width, lineBreak: false, align: 'center' });
    doc.endMarkedContent();
    doc.page.margins.bottom = bottom;
  }
  root.end();
  doc.end();
  return result;
}
