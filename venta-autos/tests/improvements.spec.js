import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const reference='aabbccdd-1234-4123-8123-aabbccddeeff';
const user={id:1,nombre:'Cliente',email:'cliente@example.test',token:'mock'};
const cars=[80,100].map((precio,i)=>({id:i+1,marca:'Marca',modelo:`Modelo ${i+1}`,anio:2026,precio,categoria:'gasolina',stock:1,imagen:'/car.svg',especificaciones:{}}));
test.beforeEach(async({page})=>{
  await page.addInitScript(user=>localStorage.setItem('usuario_premium',JSON.stringify(user)),user);
  await page.route('**/api/apartados',r=>r.fulfill({json:cars}));
  await page.route('**/api/vehiculos',r=>r.fulfill({json:cars}));
  await page.route('**/api/chat/config',r=>r.fulfill({json:{enabled:true}}));
  await page.route('**/api/mercadopago/config',r=>r.fulfill({json:{ambiente:'produccion',habilitado:true,public_key:'APP_USR-mock'}}));
});
test('filtro usa precios actuales, filtra y restablece sin cambiar precios',async({page})=>{
  await page.goto('/catalogo');
  await expect(page.getByRole('article')).toHaveCount(2);
  const range=page.getByLabel('Precio máximo',{exact:true});
  await expect(range).toHaveAttribute('max','100');
  await range.fill('80');await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').first()).toContainText('$80.00');
  await expect(page.getByRole('complementary',{name:'Aviso de demostración'})).toContainText('En producción se cobra dinero real');
  await page.getByRole('button',{name:'Restablecer filtros'}).click();await expect(page.getByRole('article')).toHaveCount(2);
});
test('historial ofrece PDF autenticado sin crear pagos',async({page})=>{
  await page.route('**/api/mercadopago/ordenes',r=>r.fulfill({json:[{referencia:reference,estado:'confirmado',ambiente:'produccion',importe:'80.00',items:[],creado_en:'2026-10-11T08:29:19Z',confirmado_en:'2026-10-11T08:29:19Z'}]}));
  let authorization;
  await page.route('**/api/mercadopago/ordenes/*/comprobante',r=>{
    authorization=r.request().headers().authorization;return r.fulfill({contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});
  });
  await page.goto('/carrito');await page.getByRole('button',{name:/Historial de pagos/}).click();
  await expect(page.getByRole('article')).toContainText(reference);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar comprobante PDF'}).click();
  await download;expect(authorization).toBe('Bearer mock');
  await expect(page.getByRole('status').filter({hasText:'Comprobante preparado'})).toBeVisible();
});
test('pago pendiente consulta hasta seis veces y ofrece asesor sin cobrar',async({page})=>{
  await page.clock.install();
  const order={referencia:reference,mp_order_id:'ORDMOCK1',estado:'en_proceso',ambiente:'produccion',importe:'80.00',items:[],puede_continuar:false};
  let syncs=0,payments=0;
  await page.route('**/api/mercadopago/ordenes/*',r=>r.fulfill({json:order}));
  await page.route('**/api/mercadopago/ordenes/*/sincronizar',r=>{syncs++;return r.fulfill({json:order});});
  await page.route('**/api/mercadopago/ordenes/*/pagar',r=>{payments++;return r.fulfill({json:order});});
  await page.goto(`/pago/${reference}`);await expect(page.getByText('Estamos revisando este intento automáticamente, hasta seis consultas.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Actualizar estado'})).toBeEnabled();
  const initial=syncs;
  for(let i=0;i<6;i++){await page.clock.fastForward(10000);await expect.poll(()=>syncs).toBe(initial+i+1);await expect(page.getByText(`Consultas automáticas: ${i+1} de 6.`)).toBeVisible();}
  await expect(page.getByRole('link',{name:'Pedir ayuda al asesor por WhatsApp'})).toBeVisible();
  await page.clock.fastForward(60000);expect(syncs).toBe(initial+6);expect(payments).toBe(0);
});
test('carrito móvil con chat no desborda y conserva controles accesibles',async({page})=>{
  await page.route('**/api/mercadopago/ordenes',r=>r.fulfill({json:[]}));
  await page.setViewportSize({width:390,height:844});await page.goto('/carrito');
  await expect(page.getByRole('button',{name:'Continuar al pago'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'¿Necesitas ayuda?'}).click();
  await expect(page.getByRole('group',{name:'Problemas frecuentes'})).toBeVisible();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).disableRules(['frame-tested']).analyze();
  expect(result.violations.map(v=>v.id)).toEqual([]);
  await page.screenshot({path:'test-results/improved-mobile.png'});
});
test('seguimiento se detiene al confirmar y habilita PDF sin repetir cobro',async({page})=>{
  await page.clock.install();
  const pending={referencia:reference,mp_order_id:'ORDMOCK2',estado:'en_proceso',ambiente:'produccion',importe:'80.00',items:[],puede_continuar:false};
  let syncs=0,approved=false;
  await page.route('**/api/mercadopago/ordenes/*',r=>r.fulfill({json:pending}));
  await page.route('**/api/mercadopago/ordenes/*/sincronizar',r=>{syncs++;return r.fulfill({json:approved?{...pending,estado:'confirmado'}:pending});});
  await page.goto(`/pago/${reference}`);await expect(page.getByText('Consultas automáticas: 0 de 6.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Actualizar estado'})).toBeEnabled();
  const initial=syncs;approved=true;
  await page.clock.fastForward(10000);await expect(page.getByRole('heading',{name:'Pago confirmado',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Descargar comprobante PDF'})).toBeVisible();
  await page.clock.fastForward(60000);expect(syncs).toBe(initial+1);
});
