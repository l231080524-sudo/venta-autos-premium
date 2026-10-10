import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cars = ['gasolina', 'hibrido', 'electrico', 'superdeportivo'].map((categoria, i) => ({
  id: i + 1, marca: 'AutoPremium', modelo: `Modelo ${i + 1}`, anio: 2026, precio: 2500000,
  categoria, stock: i === 3 ? 0 : 2, imagen: `https://images.example.test/car-${i}.svg`,
  descripcion: 'Vehículo de prueba con una descripción completa y legible.',
  especificaciones: { motor: 'Motor de prueba', potencia: '470 HP', transmision: 'Automática de ocho velocidades' },
}));
const user = { id: 999, nombre: 'Cliente de prueba', email: 'prueba@example.test' };

test.beforeEach(async ({ page }) => {
  // Every non-local request is intercepted, including any mutation, so tests never reach production.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      const body = url.pathname === '/api/vehiculos' ? cars : url.pathname.startsWith('/api/auth/') ? { usuario: user } : cars.slice(0, 2);
      return route.fulfill({ json: body });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#53677a"/></svg>' });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="es"><title>Mapa de prueba</title><body><p>Mapa de prueba</p></body></html>' });
  });
});

async function audit(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa', 'wcag22aa']).disableRules(['frame-tested']).options({ rules: { 'color-contrast-enhanced': { enabled: true } } }).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
}

for (const theme of ['dark', 'light']) {
  test(`tarjetas compactas: alineación, ficha técnica y teclado en ${theme}`, async ({ page }) => {
    const inventory = cars.slice(0, 3).map((car, i) => ({ ...car, categoria: 'gasolina', modelo: ['M4', 'Vantage V8 Elegance', 'AMG G 63 Edición Especial de Colección'][i] }));
    await page.route('**/api/vehiculos', route => route.fulfill({ json: inventory }));
    await page.addInitScript(theme => localStorage.setItem('ap-theme', theme), theme);
    await page.goto('/catalogo');
    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('dl')).toHaveCount(0);
    await expect(page.getByText(inventory[0].descripcion, { exact: true })).toHaveCount(0);
    const bottoms = await cards.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().bottom));
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThan(2);
    const buttons = await cards.locator('.car-purchase button').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().bottom));
    expect(Math.max(...buttons) - Math.min(...buttons)).toBeLessThan(2);
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/tarjetas-${theme}.png` });
    const more = cards.first().getByRole('button', { name: /Más información/ });
    await more.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(inventory[0].descripcion);
    await expect(dialog).toContainText('470 HP');
    await audit(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
  });
}

test('pie de página compartido y enlaces funcionales', async ({ page }) => {
  for (const route of ['/', '/catalogo', '/carrito']) {
    await page.goto(route);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveCount(1);
    await expect(footer).toContainText('Av. Telecomunicaciones');
    await footer.getByRole('link', { name: 'Volver arriba' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  await page.getByRole('contentinfo').getByRole('link', { name: 'Catálogo', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/catalogo');
});

for (const theme of ['dark', 'light']) {
  for (const route of ['/', '/catalogo', '/carrito']) {
    test(`${route}: ${theme}, contraste y semántica`, async ({ page }) => {
      await page.addInitScript(({ theme, user }) => { localStorage.setItem('ap-theme', theme); localStorage.setItem('usuario_premium', JSON.stringify(user)); }, { theme, user });
      await page.goto(route);
      if (route === '/catalogo') await expect(page.getByRole('article')).toHaveCount(4);
      if (route === '/carrito') await expect(page.getByRole('checkbox')).toHaveCount(2);
      await audit(page);
      if (route === '/') await page.screenshot({ path: `test-results/inicio-${theme}.png` });
      if (route === '/catalogo') {
        await page.getByRole('article').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/catalogo-${theme}.png` });
      }
      const families = await page.locator('body *').evaluateAll(elements => [...new Set(elements.filter(el => el.getClientRects().length && el.textContent.trim()).map(el => getComputedStyle(el).fontFamily))]);
      expect(families).toHaveLength(1);
    });
    test(`${route}: ${theme}, móvil y texto al 200 %`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.addInitScript(({ theme, user }) => { localStorage.setItem('ap-theme', theme); localStorage.setItem('ap-text-size', '200'); localStorage.setItem('usuario_premium', JSON.stringify(user)); }, { theme, user });
      await page.goto(route);
      if (route === '/catalogo') await expect(page.getByRole('article')).toHaveCount(4);
      if (route === '/carrito') await expect(page.getByRole('checkbox')).toHaveCount(2);
      await expect(page.locator('html')).toHaveCSS('font-size', '32px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Menú' }).click();
      await expect(page.getByRole('navigation')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('navigation')).not.toBeVisible();
    });
  }
}

test('teclado: salto, enlaces, ventana de acceso y restauración del foco', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('button', { name: 'Cuenta y preferencias', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await audit(page);
  await page.getByRole('button', { name: 'Regístrate aquí' }).click();
  await expect(page.getByLabel('Nombre Completo')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cuenta y preferencias', exact: true })).toBeFocused();
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Catálogo', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveTitle('Catálogo | AutoPremium CDMX');
});

test('preferencias persistentes, filtros y stock', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('button', { name: 'Cuenta y preferencias', exact: true }).click();
  await page.getByLabel('Apariencia').selectOption('light');
  await page.getByLabel('Tamaño del texto').selectOption('200');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveCSS('font-size', '32px');
  await page.getByRole('button', { name: 'Eléctricos', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Eléctricos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('slider').focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('0 vehículos encontrados');
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Superdeportivos', exact: true }).click();
  await expect(page.getByRole('button', { name: /Sin existencias:/ })).toBeDisabled();
});

test('carrito: selección y ventana de simulación accesible sin enviar pagos', async ({ page }) => {
  await page.addInitScript(user => localStorage.setItem('usuario_premium', JSON.stringify(user)), user);
  await page.goto('/carrito');
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  await page.getByRole('button', { name: 'Deseleccionar todos' }).click();
  await expect(page.getByRole('button', { name: 'Liquidar Selección' })).toBeDisabled();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Liquidar Selección' }).click();
  await expect(page.getByRole('dialog', { name: 'Simulación de pago' })).toBeVisible();
  await audit(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Liquidar Selección' })).toBeFocused();
});

test('errores de catálogo y de acceso se anuncian con texto', async ({ page }) => {
  await page.route('**/api/vehiculos', route => route.fulfill({ status: 503, json: { error: 'No disponible' } }));
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { error: 'Correo o contraseña incorrectos.' } }));
  await page.goto('/catalogo');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar');
  await audit(page);
  await page.getByRole('button', { name: 'Cuenta y preferencias', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByLabel('Correo Electrónico').fill(user.email);
  await page.getByLabel('Contraseña de Seguridad').fill('dato-de-prueba');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('⚠️ Correo o contraseña incorrectos.');
  await audit(page);
});

test('historial de compras: lectura accesible sin modificar datos', async ({ page }) => {
  await page.addInitScript(({ user, cars }) => {
    localStorage.setItem('usuario_premium', JSON.stringify(user));
    localStorage.setItem(`compras_${user.id}`, JSON.stringify([{ idTransaccion: 'PRUEBA-001', fecha: '10 de octubre de 2026', items: [cars[0]], total: 2900000, subtotal: 2500000, iva: 400000, tema: 'gasolina', cliente: user.nombre }]));
  }, { user, cars });
  await page.goto('/carrito');
  await page.getByRole('button', { name: /Compras Realizadas/ }).click();
  await expect(page.getByRole('heading', { name: 'PRUEBA-001' })).toBeVisible();
  await audit(page);
});

for (const route of ['/', '/catalogo', '/carrito']) {
  test(`${route}: un menú fijo, mapa local y regreso a Inicio`, async ({ page }) => {
    await page.goto(route);
    if (route === '/catalogo') await expect(page.getByRole('article')).toHaveCount(4);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.locator('#mapa-showroom')).toHaveCount(1);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Dónde encontrarnos' }).click();
    await expect(page).toHaveURL(`http://127.0.0.1:4173${route}#mapa-showroom`);
    await expect.poll(() => page.locator('#mapa-showroom').evaluate(el => {
      const header = document.querySelector('.site-header').getBoundingClientRect();
      return Math.abs(el.getBoundingClientRect().top - header.bottom - parseFloat(getComputedStyle(document.documentElement).fontSize));
    })).toBeLessThan(5);
    await expect(page.locator('iframe[title="Ubicación AutoPremium CDMX"]')).toBeInViewport();
    expect(await page.locator('.site-header').evaluate(el => el.getBoundingClientRect().top)).toBe(0);
    // Repeat the same hash after the user has manually scrolled away.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Dónde encontrarnos' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test('cuenta: acceso, nombre, preferencias y cierre de sesión', async ({ page }) => {
  await page.goto('/');
  const account = page.getByRole('button', { name: 'Cuenta y preferencias', exact: true });
  await account.click();
  await audit(page);
  await page.screenshot({ path: 'test-results/cuenta-oscuro.png' });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByLabel('Correo Electrónico').fill(user.email);
  await page.getByLabel('Contraseña de Seguridad').fill('dato-de-prueba');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await account.click();
  await expect(page.locator('#panel-cuenta')).toContainText(user.nombre);
  await expect(page.getByLabel('Apariencia')).toBeVisible();
  await expect(page.getByLabel('Tamaño del texto')).toBeVisible();
  await page.getByLabel('Apariencia').selectOption('light');
  await audit(page);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.locator('#panel-cuenta')).not.toContainText(user.nombre);
  await expect(page.locator('#panel-cuenta').getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByLabel('Apariencia')).toHaveValue('light');
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
  await expect(page.locator('#panel-cuenta')).toHaveCount(0);
});

test('cuenta móvil al 200 %, sin desbordamiento y con preferencias alcanzables', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => localStorage.setItem('ap-text-size', '200'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cuenta y preferencias', exact: true }).click();
  expect(await page.locator('#panel-cuenta').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByLabel('Tamaño del texto').selectOption('150');
  await expect(page.locator('html')).toHaveCSS('font-size', '24px');
  await page.getByLabel('Apariencia').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: 'test-results/cuenta-movil.png' });
});

test('mapa visible desde el menú móvil y movimiento reducido', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/catalogo', '/carrito']) {
    await page.goto(route);
    if (route === '/catalogo') await expect(page.getByRole('article')).toHaveCount(4);
    await page.getByRole('button', { name: 'Menú', exact: true }).click();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Dónde encontrarnos' }).click();
    await expect(page.locator('iframe[title="Ubicación AutoPremium CDMX"]')).toBeInViewport();
    await expect(page.getByRole('navigation')).not.toBeVisible();
    await expect(page.locator('#mapa-showroom')).toBeFocused();
  }
});
