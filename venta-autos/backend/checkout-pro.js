import { cents, money, requireValue } from './core.js';

export function checkoutURL(value, id) {
  let url;
  try {url=new URL(value);} catch {requireValue(false,502,'Mercado Pago no devolvió un enlace válido.');}
  requireValue(url.protocol==='https:' && ['www.mercadopago.com.mx','mercadopago.com.mx'].includes(url.hostname)
    && !url.username && !url.password && !url.port && url.pathname.startsWith('/checkout/')
    && url.searchParams.get('order_id')===id,502,'El enlace de checkout no corresponde a esta orden.');
  return url.href;
}

export function checkoutBody(order, details, config) {
  const origin = config.siteUrl || 'https://venta-autos-premium-uv3b.vercel.app';
  let url;
  try {url=new URL(origin);} catch {requireValue(false,503,'Configura PUBLIC_SITE_URL con la dirección de tu página.');}
  requireValue(url.protocol==='https:' && !url.username && !url.password && url.pathname==='/'
    && !url.search && !url.hash,503,'PUBLIC_SITE_URL debe ser el origen HTTPS de tu página.');
  const returnURL=`${url.origin}/pago/${order.referencia}`;
  return {type:'online',processing_mode:'manual',capture_mode:'automatic',
    external_reference:order.referencia,total_amount:money(cents(order.importe_a_cobrar)),
    description:'Demostración AutoPremium sin entrega de vehículos',expiration_time:'PT1H',
    payer:{email:config.environment==='prueba'?config.buyerEmail:order.comprador_email},
    items:details.map(item=>({title:`${config.environment==='prueba'?'Prueba':'Demostración'}: ${item.marca} ${item.modelo}`,
      quantity:item.cantidad,unit_price:money(cents(item.precio_unitario))})),
    config:{online:{success_url:returnURL,failure_url:returnURL,pending_url:returnURL,auto_return:'approved',retries:{allowed:false}},
      payment_method:{max_installments:1}}};
}
