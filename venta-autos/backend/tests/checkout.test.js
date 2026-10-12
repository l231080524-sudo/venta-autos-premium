import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createApp } from '../../server.js';
import { sessionToken } from '../core.js';

// Solo base aislada en loopback/55439. Jamás se utiliza DATABASE_URL ni la base del proyecto.
const url = process.env.TEST_DATABASE_URL;
test('checkout integrado con PostgreSQL y proveedor controlado', { skip: !url }, async t => {
  const parsed = new URL(url);
  assert.ok(['127.0.0.1','localhost'].includes(parsed.hostname) && parsed.port === '55439');
  const schema = `mp_test_${randomUUID().replaceAll('-','')}`;
  const root = new pg.Pool({ connectionString: url });
  await root.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema},public` });
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end();
    await root.query(`DROP SCHEMA ${schema} CASCADE`);
    await root.end();
  });
  await pool.query(`CREATE TYPE user_role AS ENUM ('cliente','admin');
    CREATE TYPE car_category AS ENUM ('gasolina','hibrido','electrico','superdeportivo');
    CREATE TYPE order_status AS ENUM ('pendiente','apartado','cancelado');
    CREATE TABLE usuarios(id SERIAL PRIMARY KEY,nombre VARCHAR(100),email VARCHAR(150) UNIQUE,password_hash VARCHAR(255),rol user_role DEFAULT 'cliente',telefono VARCHAR(20));
    CREATE TABLE vehiculos(id SERIAL PRIMARY KEY,marca VARCHAR(50),modelo VARCHAR(100),anio INT,precio NUMERIC(12,2),categoria car_category,imagen TEXT,especificaciones JSONB,descripcion TEXT,stock INT);
    CREATE TABLE apartados(id SERIAL PRIMARY KEY,usuario_id INT REFERENCES usuarios(id),vehiculo_id INT REFERENCES vehiculos(id),status order_status DEFAULT 'apartado',UNIQUE(usuario_id,vehiculo_id,status));`);
  for (let pass = 0; pass < 2; pass++) for (const file of ['001_pagos.sql','002_checkout_orders.sql','003_produccion.sql'])
    await pool.query(await readFile(new URL(`../../db/${file}`,import.meta.url),'utf8'));
  await pool.query(`INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES
    ('Uno','uno@example.test','legacy123','cliente'),('Dos','dos@example.test','otra','cliente'),('Admin','admin@example.test','admin123','admin');
    INSERT INTO vehiculos(marca,modelo,anio,precio,categoria,imagen,especificaciones,stock) VALUES
    ('Marca','Modelo',2026,3000000,'gasolina','https://example.test/car','{}',5),('Otra','Otro',2026,2000000,'electrico','https://example.test/car2','{}',3);
    INSERT INTO apartados(usuario_id,vehiculo_id) VALUES (1,1),(2,2);`);
  const config = { enabled:true,environment:'prueba',testUnitPrice:'1.00',accessToken:'falso',authSecret:'secreto-de-pruebas-'.repeat(3),
    sellerId:'5',applicationId:'9',buyerEmail:'test@testuser.com',webhookSecret:'webhook-test',origins:[] };
  const provider = new Map(), keys = [], bodies = [];
  let clock = Date.now(), loseResponse = false, rejectRequest = false, nextStatus = 'created';
  const mp = {
    assertSeller: async () => {},
    create: async (body,key) => {
      keys.push(key); bodies.push(body);
      if(rejectRequest) {rejectRequest=false;throw Object.assign(new Error('Solicitud rechazada'),{status:502,definitive:true});}
      let remote = [...provider.values()].find(value=>value.key===key);
      if (!remote) {
        const id=`ORDTEST${provider.size+1}`;
        remote={id,key,external_reference:body.external_reference,total_amount:body.total_amount,total_paid_amount:'0.00',country_code:'MEX',user_id:'5',integration_data:{application_id:'9'},status:nextStatus,status_detail:'pending',last_updated_date:new Date(++clock).toISOString()};
        remote.processing_mode=body.processing_mode;
        if(body.processing_mode==='manual') remote.checkout_url=`https://www.mercadopago.com.mx/checkout/v1/redirect?order_id=${id}`;
        provider.set(id,remote);
      }
      if (loseResponse) { loseResponse=false; throw new Error('Respuesta perdida'); }
      return {...remote};
    },
    get: async id => structuredClone(provider.get(id)),
  };
  server=createApp({pool,config,mp}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function request(path,body,user=1,method='POST',headers={}) {
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionToken(user,config.authSecret)}`,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.text(); return {status:response.status,data:result?JSON.parse(result):null};
  }
  // Forma real del Brick mexicano: puede no pedir ni entregar identificación.
  const form={token:'token-falso-de-prueba',payment_method_id:'visa',payment_type_id:'credit_card',installments:1,payer:{email:config.buyerEmail}};
  const ref=randomUUID(), path=`/api/mercadopago/ordenes/${ref}`;
  await t.test('sesiones, precio servidor y propiedad del carrito',async()=> {
    assert.equal((await request('/api/usuarios',undefined,1,'GET')).status,403);
    assert.equal((await request('/api/apartados',undefined,1,'GET',{Authorization:'Bearer falso'})).status,401);
    assert.equal((await request('/api/mercadopago/ordenes',{referencia:randomUUID(),apartados_ids:[2]})).status,409);
    assert.equal((await request('/api/apartados/pagar',{usuario_id:1})).status,410);
    const created=await request('/api/mercadopago/ordenes',{referencia:ref,apartados_ids:[1],importe:0.01});
    assert.equal(created.status,201);
    assert.equal((await request(path,undefined,1,'GET')).data.importe,'1.00');
    assert.equal((await request(path,undefined,2,'GET')).status,404);
    assert.equal((await request(path+'/comprobante',undefined,1,'GET')).status,409);
    const again=await request('/api/mercadopago/ordenes',{referencia:randomUUID(),apartados_ids:[1]});
    assert.equal(again.data.referencia,ref);
    assert.equal((await pool.query('SELECT COUNT(*) FROM ordenes')).rows[0].count,'1');
  });
  await t.test('documento incompleto se rechaza sin enviar una solicitud al proveedor',async()=> {
    assert.equal((await request(path+'/pagar',{...form,payer:{...form.payer,identification:{type:'CURP'}}})).status,400);
    assert.equal(keys.length,0);
    assert.equal((await pool.query('SELECT solicitud_mp FROM pagos')).rows[0].solicitud_mp,null);
  });
  await t.test('sin documento: respuesta perdida, reinicio y concurrencia conservan intento',async()=> {
    loseResponse=true;
    assert.equal((await request(path+'/pagar',form)).status,500);
    const saved=(await pool.query('SELECT solicitud_mp FROM pagos')).rows[0].solicitud_mp;
    assert.equal(JSON.stringify(saved).includes(form.token),false);
    assert.equal((await request(path+'/cancelar')).status,409);
    const recovering=(await request(path,undefined,1,'GET')).data;
    assert.equal(recovering.puede_recuperar,true);
    assert.equal(recovering.puede_cancelar,false);
    const results=await Promise.all([request(path+'/pagar',form),request(path+'/pagar',{...form,token:'otra-token-prueba'})]);
    assert.ok(results.every(result=>[200,409].includes(result.status)));
    assert.equal(new Set(keys).size,1);
    assert.equal(provider.size,1);
    assert.ok(bodies.every(body=>body.transactions.payments[0].payment_method.token===form.token));
    assert.ok(bodies.every(body=>!Object.hasOwn(body.payer,'identification')));
    assert.equal((await pool.query('SELECT solicitud_mp FROM pagos')).rows[0].solicitud_mp,null);
    assert.equal((await request(path,undefined,1,'GET')).data.puede_recuperar,false);
    assert.equal((await pool.query('SELECT COUNT(*) FROM apartados WHERE usuario_id=1')).rows[0].count,'1');
  });
  await t.test('importe adulterado o retorno falsificado jamás confirma',async()=> {
    const remote=provider.get('ORDTEST1');
    remote.status='processed';remote.status_detail='accredited';remote.total_paid_amount='2.00';remote.last_updated_date=new Date(++clock).toISOString();
    assert.equal((await request(path+'/sincronizar')).status,502);
    assert.equal((await request(path+'?status=approved',undefined,1,'GET')).data.estado,'pendiente');
    assert.equal((await pool.query('SELECT COUNT(*) FROM apartados WHERE usuario_id=1')).rows[0].count,'1');
    remote.status='failed';remote.status_detail='card_insufficient_amount';remote.total_paid_amount='0.00';remote.last_updated_date=new Date(++clock).toISOString();
    assert.equal((await request(path+'/sincronizar')).data.estado,'rechazado');
    assert.equal((await request(path,undefined,1,'GET')).data.puede_cancelar,true);
  });
  await t.test('tarjeta rechazada admite nuevo intento con nueva clave, sin perder historial',async()=> {
    assert.equal((await request(path+'/pagar',form)).status,200);
    assert.equal(provider.size,2);
    assert.equal(new Set(keys).size,2);
    assert.equal((await pool.query('SELECT COUNT(*) FROM pagos')).rows[0].count,'2');
  });
  await t.test('webhook firmado y repetido confirma una sola vez, no altera inventario',async()=> {
    const remote=provider.get('ORDTEST2');
    remote.status='processed';remote.status_detail='accredited';remote.total_paid_amount='1.00';remote.last_updated_date=new Date(++clock).toISOString();
    remote.transactions={payments:[{id:'PAYTEST2',status:'processed',status_detail:'accredited',amount:'1.00',payment_method:{id:'visa',type:'credit_card',installments:1,token:'NUNCA_GUARDAR'}}]};
    const body={type:'order',data:{id:remote.id},live_mode:false};
    assert.equal((await request('/api/mercadopago/webhook?data.id='+remote.id,body)).status,401);
    const ts=String(Date.now()),requestId='req-webhook',signature=createHmac('sha256',config.webhookSecret).update(`id:${remote.id.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');
    // Webhook responde texto OK; usamos fetch directamente.
    const notify=()=>fetch(base+'/api/mercadopago/webhook?data.id='+remote.id,{method:'POST',headers:{'Content-Type':'application/json','x-signature':`ts=${ts},v1=${signature}`,'x-request-id':requestId},body:JSON.stringify(body)});
    assert.equal((await notify()).status,200); assert.equal((await notify()).status,200);
    assert.equal((await request(path,undefined,1,'GET')).data.estado,'confirmado');
    assert.equal((await request(path+'/pagar',form)).status,409);
    assert.equal((await pool.query('SELECT COUNT(*) FROM apartados WHERE usuario_id=1')).rows[0].count,'0');
    assert.equal((await pool.query('SELECT COUNT(*) FROM apartados WHERE usuario_id=2')).rows[0].count,'1');
    assert.equal((await pool.query('SELECT stock FROM vehiculos WHERE id=1')).rows[0].stock,5);
    assert.equal(JSON.stringify((await pool.query('SELECT transacciones FROM pagos')).rows).includes('NUNCA_GUARDAR'),false);
    remote.status='created';remote.status_detail='pending';remote.last_updated_date=new Date(clock-1000).toISOString();
    assert.equal((await request(path+'/sincronizar')).data.estado,'confirmado');
  });
  await t.test('comprobante: sesión, propietario y acreditación; descarga no vuelve a cobrar',async()=> {
    const download = (user=1) => fetch(base+path+'/comprobante', {
      headers: { Authorization: `Bearer ${sessionToken(user,config.authSecret)}` },
    });
    assert.equal((await fetch(base+path+'/comprobante')).status,401);
    assert.equal((await download(2)).status,404);
    const before = keys.length;
    const first = await download();
    assert.equal(first.status,200);
    assert.equal(first.headers.get('content-type'),'application/pdf');
    assert.equal(first.headers.get('cache-control'),'no-store');
    assert.ok(first.headers.get('content-disposition').includes(ref));
    assert.ok(Buffer.from(await first.arrayBuffer()).subarray(0,5).equals(Buffer.from('%PDF-')));
    assert.equal((await download()).status,200);
    assert.equal(keys.length,before);
    // Los cambios actuales del catálogo no modifican el histórico utilizado por el PDF.
    await pool.query("UPDATE vehiculos SET modelo='Modelo actualizado',precio=999 WHERE id=1");
    const historical=(await pool.query('SELECT modelo,precio_unitario FROM orden_detalles WHERE orden_id=1')).rows[0];
    assert.equal(historical.modelo,'Modelo');
    assert.equal(historical.precio_unitario,'1.00');
    await pool.query("UPDATE pagos SET estado_proveedor='refunded',detalle_estado_proveedor='refunded' WHERE mp_payment_id='PAYTEST2'");
    assert.equal((await download()).status,409);
    await pool.query("UPDATE pagos SET estado_proveedor='processed',detalle_estado_proveedor='accredited' WHERE mp_payment_id='PAYTEST2'");
  });
  await t.test('login migra contraseña heredada y entrega sesión; email institucional no concede rol',async()=> {
    const login=await request('/api/auth/login',{email:'uno@example.test',password:'legacy123'});
    assert.equal(login.status,200);assert.ok(login.data.token);
    assert.ok((await pool.query('SELECT password_hash FROM usuarios WHERE id=1')).rows[0].password_hash.startsWith('scrypt:'));
    const signup=await request('/api/auth/registro',{nombre:'Cliente',email:'cliente@autopremium.com',password:'prueba123',telefono:''});
    assert.equal(signup.data.rol,'cliente');
  });
  await t.test('cancelar borrador libera carrito; error definitivo permite otro intento sin inventar confirmación',async()=> {
    let draft=randomUUID(),draftPath=`/api/mercadopago/ordenes/${draft}`;
    assert.equal((await request('/api/mercadopago/ordenes',{referencia:draft,apartados_ids:[2]},2)).status,201);
    assert.equal((await request(draftPath+'/cancelar',undefined,2)).status,200);
    assert.equal((await request(draftPath,undefined,2,'GET')).data.estado,'cancelado');
    draft=randomUUID();draftPath=`/api/mercadopago/ordenes/${draft}`;
    assert.equal((await request('/api/mercadopago/ordenes',{referencia:draft,apartados_ids:[2]},2)).data.referencia,draft);
    rejectRequest=true;
    assert.equal((await request(draftPath+'/pagar',form,2)).status,502);
    assert.equal((await request(draftPath,undefined,2,'GET')).data.estado,'rechazado');
    assert.equal((await request(draftPath+'/pagar',form,2)).status,200);
    assert.equal((await request(draftPath+'/cancelar',undefined,2)).status,409);
    const remote=provider.get('ORDTEST3');
    remote.status='failed';remote.status_detail='rejected';remote.last_updated_date=new Date(++clock).toISOString();
    assert.equal((await request(draftPath+'/cancelar',undefined,2)).status,200);
    assert.equal((await request('/api/apartados/2',undefined,2,'DELETE')).status,200);
  });
  await t.test('producción: precios Neon, consentimiento, cargo único, webhook real y PDF; historial Sandbox protegido',async()=> {
    Object.assign(config,{environment:'produccion',accessToken:'APP_USR-falso',publicKey:'APP_USR-public-falso'});
    await pool.query('UPDATE vehiculos SET precio=CASE WHEN id=1 THEN 100 ELSE 80 END');
    const selected=(await pool.query('INSERT INTO apartados(usuario_id,vehiculo_id) VALUES(1,1),(1,2) RETURNING id')).rows.map(row=>row.id);
    const prodRef=randomUUID(),prodPath=`/api/mercadopago/ordenes/${prodRef}`;
    assert.equal((await request('/api/mercadopago/ordenes',{referencia:prodRef,apartados_ids:selected,importe:'0.01'})).status,201);
    const saved=await request(prodPath,undefined,1,'GET');
    assert.equal(saved.data.importe,'180.00'); assert.equal(saved.data.ambiente,'produccion');
    assert.deepEqual(saved.data.items.map(item=>item.precio_unitario),['100.00','80.00']);
    assert.equal((await request(path,undefined,1,'GET')).data.puede_continuar,false);
    assert.equal((await request(path+'/pagar',form)).status,409);
    const productionForm={...form,payer:{email:'uno@example.test'}};
    assert.equal((await request(prodPath+'/pagar',productionForm)).status,400);
    assert.equal((await request(prodPath+'/pagar',{...form,acepto_cobro_real:true})).status,400);
    await pool.query('UPDATE vehiculos SET precio=1'); // El importe autorizado es el histórico mostrado.
    const before=keys.length;
    const submissions=await Promise.all([request(prodPath+'/pagar',{...productionForm,acepto_cobro_real:true}),request(prodPath+'/pagar',{...productionForm,acepto_cobro_real:true})]);
    assert.ok(submissions.every(result=>[200,409].includes(result.status)));
    assert.equal(keys.length,before+1);
    assert.equal(bodies.at(-1).total_amount,'180.00');
    assert.equal(bodies.at(-1).payer.email,'uno@example.test');
    assert.ok((await pool.query('SELECT autorizado_en FROM pagos WHERE ambiente=$1',['produccion'])).rows[0].autorizado_en);
    const remote=[...provider.values()].at(-1);
    remote.status='processed';remote.status_detail='accredited';remote.total_paid_amount='180.00';remote.live_mode=true;remote.last_updated_date=new Date(++clock).toISOString();
    remote.transactions={payments:[{id:'PAYPROD1',status:'processed',status_detail:'accredited',amount:'180.00',payment_method:{id:'visa',type:'credit_card',installments:1}}]};
    const ts=String(Date.now()),requestId='prod-request',signature=createHmac('sha256',config.webhookSecret).update(`id:${remote.id};request-id:${requestId};ts:${ts};`).digest('hex');
    const notify=live=>fetch(base+'/api/mercadopago/webhook?data.id='+remote.id,{method:'POST',headers:{'Content-Type':'application/json','x-signature':`ts=${ts},v1=${signature}`,'x-request-id':requestId},body:JSON.stringify({type:'order',data:{id:remote.id},live_mode:live})});
    assert.equal((await notify(false)).status,400);
    assert.equal((await notify(true)).status,200); assert.equal((await notify(true)).status,200);
    assert.equal((await request(prodPath,undefined,1,'GET')).data.estado,'confirmado');
    assert.equal((await request(prodPath+'/pagar',{...productionForm,acepto_cobro_real:true})).status,409);
    assert.equal(keys.length,before+1);
    const pdf=await fetch(base+prodPath+'/comprobante',{headers:{Authorization:`Bearer ${sessionToken(1,config.authSecret)}`}});
    assert.equal(pdf.status,200); assert.ok(pdf.headers.get('content-disposition').includes('comprobante-produccion-'));
    assert.equal((await pool.query('SELECT stock FROM vehiculos WHERE id=1')).rows[0].stock,5);
    const sandbox=await fetch(base+path+'/comprobante',{headers:{Authorization:`Bearer ${sessionToken(1,config.authSecret)}`}});
    assert.equal(sandbox.status,200); assert.ok(sandbox.headers.get('content-disposition').includes('comprobante-prueba-'));
    for(const price of [0,-1,'80.123','NaN']) assert.equal((await request('/api/vehiculos/1',{precio:price},3,'PUT')).status,400);
  });
  await t.test('Checkout Pro: autorización, recuperación idempotente, bloqueo de tarjeta y confirmación con PDF',async()=>{
    const selection=(await pool.query('INSERT INTO apartados(usuario_id,vehiculo_id) VALUES(1,1) RETURNING id')).rows[0].id;
    const reference=randomUUID(),proPath=`/api/mercadopago/ordenes/${reference}`;
    assert.equal((await request('/api/mercadopago/ordenes',{referencia:reference,apartados_ids:[selection]})).status,201);
    const before=keys.length;
    assert.equal((await request(proPath+'/checkout',{},2)).status,404);
    assert.equal((await request(proPath+'/checkout',{})).status,400);
    assert.equal(keys.length,before);
    loseResponse=true;
    assert.equal((await request(proPath+'/checkout',{acepto_cobro_real:true,importe:999})).status,500);
    assert.equal((await request(proPath+'/pagar',{...form,payer:{email:'uno@example.test'},acepto_cobro_real:true})).status,409);
    const links=await Promise.all([request(proPath+'/checkout',{}),request(proPath+'/checkout',{})]);
    assert.ok(links.every(result=>result.status===200));
    assert.equal(keys.at(-1),keys.at(-2));assert.equal(new Set(keys.slice(before)).size,1);
    assert.equal(bodies.at(-1).processing_mode,'manual');assert.equal(bodies.at(-1).total_amount,'1.00');
    const remote=[...provider.values()].at(-1);
    assert.equal(links[0].data.checkout_url,remote.checkout_url);
    assert.equal((await request(proPath,undefined,1,'GET')).data.puede_continuar,false);
    assert.equal((await request(proPath+'/cancelar',{})).status,409);
    assert.equal((await request(proPath+'/pagar',{...form,payer:{email:'uno@example.test'},acepto_cobro_real:true})).status,409);
    const validURL=remote.checkout_url;remote.checkout_url='https://evil.test/checkout/?order_id='+remote.id;
    assert.equal((await request(proPath+'/checkout',{})).status,502);remote.checkout_url=validURL;
    remote.status='processed';remote.status_detail='accredited';remote.total_paid_amount='1.00';remote.live_mode=true;
    remote.last_updated_date=new Date(++clock).toISOString();
    remote.transactions={payments:[{id:'PAYWALLET1',status:'processed',status_detail:'accredited',amount:'1.00',payment_method:{id:'account_money',type:'account_money'}}]};
    assert.equal((await request(proPath+'/sincronizar',{})).data.estado,'confirmado');
    assert.equal((await request(proPath+'/checkout',{})).status,409);
    const pdf=await fetch(base+proPath+'/comprobante',{headers:{Authorization:`Bearer ${sessionToken(1,config.authSecret)}`}});
    assert.equal(pdf.status,200);
    assert.equal((await pool.query('SELECT count(*) FROM pagos WHERE orden_id=(SELECT id FROM ordenes WHERE referencia=$1)',[reference])).rows[0].count,'1');
  });
});
