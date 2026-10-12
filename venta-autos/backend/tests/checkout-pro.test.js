import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutBody, checkoutURL } from '../checkout-pro.js';

test('Checkout Pro usa precios históricos, retorno fijo y no acepta enlaces ajenos',()=>{
  const order={referencia:'aabbccdd-1234-4123-8123-aabbccddeeff',importe_a_cobrar:'180.00',comprador_email:'buyer@example.test'};
  const details=[{marca:'Marca',modelo:'Uno',cantidad:1,precio_unitario:'100.00'},{marca:'Marca',modelo:'Dos',cantidad:1,precio_unitario:'80.00'}];
  const body=checkoutBody(order,details,{environment:'produccion',siteUrl:'https://example.test'});
  assert.equal(body.processing_mode,'manual');assert.equal(body.total_amount,'180.00');
  assert.equal(body.config.online.success_url,`https://example.test/pago/${order.referencia}`);
  assert.equal(body.config.online.retries.allowed,false);assert.equal(body.config.payment_method.max_installments,1);
  assert.equal(body.transactions,undefined);assert.equal(body.items[0].unit_price,'100.00');
  const good='https://www.mercadopago.com.mx/checkout/v1/redirect?order_id=ORD123';
  assert.equal(checkoutURL(good,'ORD123'),good);
  for (const url of ['https://evil.test/checkout/?order_id=ORD123',good.replace('https:','http:'),good.replace('ORD123','ORD456'),good.replace('/checkout/','/login/'),'https://www.mercadopago.com.mx@evil.test/checkout/?order_id=ORD123'])
    assert.throws(()=>checkoutURL(url,'ORD123'));
  assert.throws(()=>checkoutBody(order,details,{environment:'produccion',siteUrl:'https://example.test/otra-ruta'}));
});
