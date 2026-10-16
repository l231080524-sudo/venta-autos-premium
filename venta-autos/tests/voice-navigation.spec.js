import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({json: url.pathname === '/api/vehiculos' ? [{id:1,marca:'Marca',modelo:'Modelo',anio:2026,precio:20,categoria:'gasolina',stock:2,imagen:'https://images.example.test/car.svg',especificaciones:{motor:'Motor de prueba'}}] : {enabled:false}});
    if (url.hostname === '127.0.0.1') return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"/>'});
    return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><title>Mapa</title><body>Mapa de prueba</body></html>'});
  });
  await page.emulateMedia({ reducedMotion:'reduce' });
});

async function mockVoice(page) {
  await page.addInitScript(() => {
    window.__voiceStarts = 0;
    window.SpeechRecognition = class {
      constructor() { this.results = []; window.__voice = this; }
      start() { window.__voiceStarts++; this.onstart?.(); }
      abort() { this.aborted = true; this.onend?.(); }
      say(text) {
        const result = [{transcript:text}]; result.isFinal = true;
        this.results.push(result);
        this.onresult?.({resultIndex:this.results.length-1,results:this.results});
      }
      fail(error) { this.onerror?.({error}); }
    };
  });
}

test('voz: rutas, desplazamiento, fichas, cuenta, cierre y parada explícita', async ({page}) => {
  await mockVoice(page);
  await page.goto('/');
  expect(await page.evaluate(() => window.__voiceStarts)).toBe(0);
  await page.getByRole('button',{name:'Accesibilidad',exact:true}).click();
  await page.getByRole('button',{name:'Activar voz',exact:true}).click();
  expect(await page.evaluate(() => ({lang:window.__voice.lang,continuous:window.__voice.continuous}))).toEqual({lang:'es-MX',continuous:true});
  await page.evaluate(() => window.__voice.say('Ir al catálogo, por favor.'));
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.evaluate(() => window.__voice.say('bajar'));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await page.evaluate(() => window.__voice.say('volver arriba'));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => window.__voice.say('más información'));
  await expect(page.getByRole('dialog',{name:'Marca Modelo',exact:true})).toContainText('Motor de prueba');
  await page.evaluate(() => window.__voice.say('carrito'));
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.evaluate(() => window.__voice.say('cerrar'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => window.__voice.say('carrito'));
  await expect(page).toHaveURL(/\/carrito$/);
  await page.evaluate(() => window.__voice.say('iniciar sesión'));
  await expect(page.getByRole('dialog',{name:'Iniciar sesión',exact:true})).toBeVisible();
  await page.evaluate(() => window.__voice.say('cerrar'));
  await page.evaluate(() => window.__voice.say('controles'));
  await expect(page.getByRole('region',{name:'Controles de navegación por teclado'})).toBeVisible();
  await page.evaluate(() => window.__voice.say('pagar con mi tarjeta'));
  await expect(page.locator('.voice-indicator')).toContainText('Comando no reconocido');
  await page.evaluate(() => window.__voice.say('inicio'));
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await page.evaluate(() => window.__voice.say('detener voz'));
  await expect(page.locator('.voice-indicator')).toHaveCount(0);
  expect(await page.evaluate(() => window.__voice.aborted)).toBe(true);
});

test('voz: permisos denegados, error de red y fin de escucha no reinician el micrófono', async ({page}) => {
  await mockVoice(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Accesibilidad',exact:true}).click();
  const start = page.getByRole('button',{name:'Activar voz',exact:true});
  await start.click();
  await page.evaluate(() => window.__voice.fail('not-allowed'));
  await expect(page.locator('.voice-settings')).toContainText('Permite el micrófono');
  await start.click();
  await page.evaluate(() => window.__voice.fail('network'));
  await expect(page.locator('.voice-settings')).toContainText('Revisa tu conexión');
  await start.click();
  await page.evaluate(() => window.__voice.onend());
  await expect(page.locator('.voice-settings')).toContainText('La escucha terminó');
  expect(await page.evaluate(() => window.__voiceStarts)).toBe(3);
  await start.click();
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.voice-settings')).toContainText('Micrófono apagado al cambiar de pestaña');
  expect(await page.evaluate(() => window.__voiceStarts)).toBe(4);
});

test('voz: navegador sin soporte mantiene las opciones de teclado disponibles', async ({page}) => {
  await page.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  await page.goto('/');
  await page.getByRole('button',{name:'Accesibilidad',exact:true}).click();
  await expect(page.locator('.voice-settings')).toContainText('no admite reconocimiento de voz');
  await expect(page.getByRole('button',{name:'Activar voz',exact:true})).toHaveCount(0);
  await page.getByLabel('Navegación por teclado',{exact:true}).check();
  await page.keyboard.press('F6');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.keyboard-controls a').first()).toBeFocused();
});

test('acceso flotante izquierdo y regreso directo desde el final de la página', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('ap-keyboard','true'));
  await page.goto('/catalogo');
  await expect(page.getByRole('article')).toHaveCount(1);
  const launcher = page.getByRole('button',{name:'Accesibilidad',exact:true});
  expect((await launcher.boundingBox()).x).toBeLessThan(100);
  expect((await page.getByRole('button',{name:'¿Necesitas ayuda?'}).boundingBox()).x).toBeGreaterThan(700);
  await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.getByRole('contentinfo').getByRole('link').last().focus();
  await page.keyboard.press('Control+Home');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'Inicio',exact:true})).toBeFocused();
  await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.keyboard.press('F6');
  await expect(page.locator('.keyboard-controls a').first()).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.keyboard.press('0');
  await expect(page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'Inicio',exact:true})).toBeFocused();
  await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.getByRole('button',{name:'Volver arriba',exact:true}).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await launcher.click();
  await expect(page.getByRole('dialog',{name:'Accesibilidad',exact:true})).toBeVisible();
  await expect(page.locator('#panel-cuenta')).toHaveCount(0);
  await page.setViewportSize({width:320,height:800});
  await page.getByLabel('Tamaño del texto').selectOption('200');
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/accesibilidad-flotante-movil.png'});
});
