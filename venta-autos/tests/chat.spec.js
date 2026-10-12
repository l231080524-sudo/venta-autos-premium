import { test, expect } from '@playwright/test';

test('chat envía pregunta, muestra precios verificados y permite reiniciar',async({page})=>{
  await page.route('**/api/chat/config',r=>r.fulfill({json:{enabled:true}}));
  await page.route('**/api/chat',r=>{
    expect(r.request().postDataJSON()).toEqual({mensaje:'¿Qué cuesta menos de $100?',historial:[]});
    return r.fulfill({json:{respuesta:'Esta opción está en el catálogo.',vehiculos:[{id:1,nombre:'Marca Modelo',precio:20,anio:2025}]}});
  });
  await page.goto('/');await page.getByRole('button',{name:'¿Necesitas ayuda?'}).click();
  await page.getByLabel('Tu pregunta').fill('¿Qué cuesta menos de $100?');await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await expect(page.getByText('Esta opción está en el catálogo.')).toBeVisible();
  await expect(page.getByText('2025 · $20.00 MXN')).toBeVisible();
  await page.screenshot({path:'test-results/chat-preview.png',fullPage:false});
  await page.getByRole('button',{name:'Nueva conversación'}).click();
  await expect(page.getByText('Esta opción está en el catálogo.')).toHaveCount(0);
});
test('fallo del chat libera formulario y mantiene catálogo accesible',async({page})=>{
  await page.route('**/api/chat/config',r=>r.fulfill({json:{enabled:true}}));
  await page.route('**/api/chat',r=>r.fulfill({status:429,json:{error:'Gemini alcanzó su cuota.'}}));
  await page.goto('/');await page.getByRole('button',{name:'¿Necesitas ayuda?'}).click();
  await page.getByLabel('Tu pregunta').fill('Hola');await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Gemini alcanzó su cuota.');
  await expect(page.getByLabel('Tu pregunta')).toBeEnabled();await expect(page.getByRole('link',{name:'Ver catálogo',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Contactar asesor por WhatsApp'})).toHaveAttribute('href',/^https:\/\/wa.me\/5215564028025\?text=/);
});
test('deriva al asesor con destino fijo y sin enviar el historial por WhatsApp',async({page})=>{
  await page.route('**/api/chat/config',r=>r.fulfill({json:{enabled:true}}));
  await page.route('**/api/chat',r=>r.fulfill({json:{respuesta:'Pide ayuda al asesor.',vehiculos:[],asesor:true}}));
  await page.goto('/');await page.getByRole('button',{name:'¿Necesitas ayuda?'}).click();
  await page.getByLabel('Tu pregunta').fill('Mi problema no se resolvió');await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await expect(page.getByText('Un asesor puede ayudarte a revisar tu caso.',{exact:false})).toBeVisible();
  const link=page.getByRole('link',{name:'Contactar asesor por WhatsApp'});
  await expect(link).toHaveAttribute('target','_blank');
  expect(decodeURIComponent(await link.getAttribute('href'))).not.toContain('Mi problema no se resolvió');
});
test('problemas frecuentes dan ayuda sin consumir Gemini y botón circular funciona en móvil',async({page})=>{
  let calls=0;
  await page.route('**/api/chat/config',r=>r.fulfill({json:{enabled:false}}));
  await page.route('**/api/chat',r=>{calls++;return r.fulfill({status:503,json:{error:'No disponible'}});});
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const toggle=page.getByRole('button',{name:'¿Necesitas ayuda?'});
  expect(await toggle.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('50%');
  await page.screenshot({path:'test-results/chat-launcher-mobile.png',animations:'disabled'});
  await toggle.click();
  await expect(page.getByRole('group',{name:'Problemas frecuentes'})).toBeVisible();
  await page.getByRole('button',{name:'Me cobraron, pero no se confirma',exact:true}).click();
  await expect(page.getByText('No vuelvas a pagar mientras se revisa el cargo.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Contactar asesor por WhatsApp'})).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole('button',{name:'Nueva conversación'}).click();
  await expect(page.getByRole('button',{name:'No puedo iniciar sesión',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/chat-topics-mobile.png'});
});
