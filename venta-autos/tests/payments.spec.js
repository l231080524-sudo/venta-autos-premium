import { test, expect } from '@playwright/test';
const ref='aabbccdd-1234-4123-8123-aabbccddeeff';
const user={id:1,nombre:'Cliente de prueba',email:'cliente@example.test',token:'token-falso'};
const item={id:1,marca:'Marca',modelo:'Modelo',precio:'2500000.00',imagen:'/car.svg'};

test('producción suma precios, exige autorización y usa la clave del servidor para un único cobro',async({page})=> {
  const items=[{...item,precio:'100.00'},{...item,id:2,modelo:'Segundo',precio:'80.00'}];
  await page.route('**/api/apartados',route=>route.fulfill({json:items}));
  await page.route('**/api/mercadopago/config',route=>route.fulfill({json:{ambiente:'produccion',habilitado:true,public_key:'APP_USR-produccion-mock',precio_prueba:'10.00'}}));
  let paymentCalls=0;
  const order={referencia:ref,ambiente:'produccion',estado:'pendiente',importe:'180.00',comprador_email:user.email,items:items.map(item=>({...item,subtotal:item.precio})),puede_continuar:true};
  await page.route('**/api/mercadopago/ordenes/*',route=>route.fulfill({json:order}));
  await page.route('**/api/mercadopago/ordenes/*/sincronizar',route=>route.fulfill({json:order}));
  await page.route('**/api/mercadopago/ordenes/*/pagar',route=> {
    paymentCalls++;const form=route.request().postDataJSON();
    expect(form.acepto_cobro_real).toBe(true);expect(form.payer.email).toBe(user.email);
    expect(form).not.toHaveProperty('transaction_amount');
    return route.fulfill({json:{...order,estado:'confirmado',puede_continuar:false}});
  });
  await page.goto('/carrito');
  await expect(page.getByText('Total: $180.00 MXN')).toBeVisible();
  await expect(page.getByText('Cobro de prueba:',{exact:false})).toHaveCount(0);
  await page.getByRole('button',{name:'Continuar al pago'}).click();
  await page.getByRole('button',{name:'Crear orden',exact:true}).click();
  await expect(page.getByRole('button',{name:'Enviar tarjeta de prueba'})).toHaveCount(0);
  await page.getByRole('checkbox',{name:/Autorizo un único cobro real/}).check();
  await expect(page.getByRole('heading',{name:'Pagar con tarjeta'})).toBeVisible();
  expect(await page.evaluate(()=>window.mpPublicKey)).toBe('APP_USR-produccion-mock');
  await expect(page.getByText(/Para simular un pago aprobado/)).toHaveCount(0);
  await page.getByRole('button',{name:'Enviar tarjeta de prueba'}).click();
  await expect(page.getByRole('heading',{name:'Pago confirmado',exact:true})).toBeVisible();
  expect(paymentCalls).toBe(1);
  await expect(page.getByText('Operación Sandbox: no es una compra real.')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Descargar comprobante PDF'})).toBeVisible();
});
test.beforeEach(async({page})=> {
  await page.addInitScript(user=> {
    localStorage.setItem('usuario_premium',JSON.stringify(user));
    // Sustituye el SDK externo: ningún dato ni solicitud de pago llega a Mercado Pago.
    window.MercadoPago=class {
      constructor(key) {window.mpPublicKey=key;}
      bricks() {return {create:async(_type,id,settings)=> {
        const button=document.createElement('button');button.textContent='Enviar tarjeta de prueba';
        button.onclick=()=>settings.callbacks.onSubmit({token:'token-falso-test',payment_method_id:'visa',installments:1,payer:{email:settings.initialization.payer.email,identification:{type:'CURP',number:'TEST123'}}},{paymentTypeId:'credit_card'}).catch(()=>{});
        document.getElementById(id).appendChild(button);
        const simulateError=document.createElement('button');simulateError.textContent='Simular planes vacíos';
        simulateError.onclick=()=>settings.callbacks.onError({type:'non_critical',cause:'missing_payment_information',message:'empty_installments'});
        document.getElementById(id).appendChild(simulateError);
        settings.callbacks.onReady();
        return {unmount:()=>{button.remove();simulateError.remove();}};
      }};}
    };
  },user);
  await page.route('**/*',async route=> {
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/')) {
      if(url.pathname==='/api/apartados') return route.fulfill({json:[item]});
      if(url.pathname==='/api/mercadopago/config') return route.fulfill({json:{habilitado:true,precio_prueba:'1.00',comprador_prueba_email:'comprador@testuser.com'}});
      if(url.pathname==='/api/mercadopago/ordenes') return route.fulfill({json:route.request().method()==='POST'?{referencia:ref}:[]});
      return route.fulfill({json:{referencia:ref,estado:'pendiente',importe:'1.00',creado_en:'2026-10-10',items:[{...item,subtotal:'1.00'}],puede_continuar:true}});
    }
    if(url.hostname==='127.0.0.1') return route.continue();
    return route.fulfill({body:'<html lang="es"><title>Prueba</title></html>',contentType:'text/html'});
  });
});

test('explica planes vacíos antes del cobro y permite recargar sin cobrar',async({page})=> {
  let paymentRequests=0;
  page.on('request',request=>{if(request.url().endsWith('/pagar'))paymentRequests++;});
  await page.goto(`/pago/${ref}`);
  await page.getByRole('button',{name:'Simular planes vacíos'}).click();
  await expect(page.getByRole('alert')).toContainText('Mercado Pago no ofrece un pago único');
  await expect(page.getByRole('alert')).toContainText('crea otra');
  await page.getByRole('button',{name:'Recargar formulario de tarjeta'}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Enviar tarjeta de prueba'})).toHaveCount(1);
  expect(paymentRequests).toBe(0);
});
test('crea orden por IDs y cobra dentro de la página; solo resultado servidor confirma',async({page})=> {
  let submitted;
  await page.route('**/api/mercadopago/ordenes/*/pagar',async route=> {
    submitted=route.request().postDataJSON();
    return route.fulfill({json:{referencia:ref,estado:'confirmado',importe:'1.00',items:[{...item,subtotal:'1.00'}],puede_continuar:false}});
  });
  await page.goto('/carrito');
  await page.getByRole('button',{name:'Continuar al pago'}).click();
  const created=page.waitForRequest(request=>request.url().endsWith('/api/mercadopago/ordenes') && request.method()==='POST');
  await page.getByRole('button',{name:'Crear orden de prueba'}).click();
  const request=await created;
  expect(request.postDataJSON().apartados_ids).toEqual([1]);
  expect(request.postDataJSON()).not.toHaveProperty('importe');
  await expect(page).toHaveURL(new RegExp(`/pago/${ref}$`));
  await page.getByRole('button',{name:'Enviar tarjeta de prueba'}).click();
  await expect(page.getByRole('heading',{name:'Pago de prueba confirmado'})).toBeVisible();
  expect(submitted.token).toBe('token-falso-test');
  expect(submitted).not.toHaveProperty('transaction_amount');
  await expect(page.getByRole('button',{name:'Enviar tarjeta de prueba'})).toHaveCount(0);
});
test('URL approved no confirma y error del backend se anuncia; móvil al 200%',async({page})=> {
  await page.setViewportSize({width:320,height:800});
  await page.addInitScript(()=>localStorage.setItem('ap-text-size','200'));
  await page.route('**/api/mercadopago/ordenes/*/pagar',route=>route.fulfill({status:502,json:{error:'No se pudo verificar el pago.'}}));
  await page.goto(`/pago/${ref}?status=approved`);
  await expect(page.getByRole('heading',{name:'Pago pendiente'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Descargar comprobante PDF'})).toHaveCount(0);
  await page.getByRole('button',{name:'Enviar tarjeta de prueba'}).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo verificar el pago.');
  await expect(page.getByRole('button',{name:'Volver a iniciar sesión'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Pago de prueba confirmado'})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('pago confirmado descarga PDF autenticado y anuncia errores de sesión',async({page})=> {
  let receiptAuthorization;
  let expired=false;
  await page.route('**/api/mercadopago/ordenes/**',route=> {
    if(route.request().url().endsWith('/comprobante')) {
      receiptAuthorization=route.request().headers().authorization;
      return expired ? route.fulfill({status:401,json:{error:'Sesión caducada.'}})
        : route.fulfill({body:Buffer.from('%PDF-1.4\n% descarga de prueba\n%%EOF'),contentType:'application/pdf'});
    }
    return route.fulfill({json:{referencia:ref,estado:'confirmado',importe:'10.00',items:[],puede_continuar:false,confirmado_en:'2026-10-11T07:23:24Z'}});
  });
  await page.goto(`/pago/${ref}`);
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar comprobante PDF'}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toBe(`comprobante-${ref}.pdf`);
  expect(await download.failure()).toBeNull();
  expect(receiptAuthorization).toBe('Bearer token-falso');
  await expect(page.getByRole('status').filter({hasText:'Comprobante preparado'})).toBeVisible();
  expired=true;
  await page.getByRole('button',{name:'Descargar comprobante PDF'}).click();
  await expect(page.getByRole('alert')).toContainText('Sesión caducada.');
  await expect(page.getByRole('button',{name:'Volver a iniciar sesión'})).toBeVisible();
});

test('documento inválido no invita a iniciar sesión; sesión caducada sí',async({page})=> {
  let status=400;
  await page.route('**/api/mercadopago/ordenes/*/pagar',route=>route.fulfill({status,json:{error:status===400?'Documento del comprador inválido.':'Sesión caducada.'}}));
  await page.goto(`/pago/${ref}`);
  await page.getByRole('button',{name:'Enviar tarjeta de prueba'}).click();
  await expect(page.getByRole('alert')).toContainText('Documento del comprador inválido.');
  await expect(page.getByRole('button',{name:'Volver a iniciar sesión'})).toHaveCount(0);
  status=401;
  await page.getByRole('button',{name:'Enviar tarjeta de prueba'}).click();
  await expect(page.getByRole('button',{name:'Volver a iniciar sesión'})).toBeVisible();
});

test('intento incierto ofrece recuperar sin nueva tarjeta y luego permite cancelar',async({page})=> {
  let retryBody;
  await page.route('**/api/mercadopago/ordenes/**',route=> {
    if(route.request().url().endsWith('/pagar')){
      retryBody=route.request().postDataJSON();
      return route.fulfill({json:{referencia:ref,estado:'rechazado',importe:'10.00',items:[],puede_recuperar:false,puede_cancelar:true,puede_continuar:true,detalle_pago:'rejected_by_issuer'}});
    }
    if(route.request().url().endsWith('/cancelar'))return route.fulfill({json:{success:true}});
    return route.fulfill({json:{referencia:ref,estado:'pendiente',importe:'10.00',items:[],puede_recuperar:true,puede_cancelar:false,puede_continuar:true}});
  });
  await page.goto(`/pago/${ref}`);
  await expect(page.getByRole('button',{name:'Cancelar orden de prueba'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Enviar tarjeta de prueba'})).toHaveCount(0);
  await page.getByRole('button',{name:'Recuperar resultado del intento'}).click();
  expect(retryBody).toEqual({});
  await expect(page.getByText(/La tarjeta fue rechazada por el emisor/)).toBeVisible();
  await page.getByRole('button',{name:'Cancelar orden de prueba'}).click();
  await expect(page).toHaveURL(/\/carrito$/);
});
