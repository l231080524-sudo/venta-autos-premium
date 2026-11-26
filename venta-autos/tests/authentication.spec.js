import { test, expect } from '@playwright/test';

const account = { id:23,nombre:'Cliente protegido',email:'cliente@example.test',rol:'cliente',token:'session-test-token' };

test('inicia sesión con correo y contraseña, después valida el código de la app autenticadora', async ({ page }) => {
  let loginPayload;
  let verificationPayload;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/login') {
      loginPayload = route.request().postDataJSON();
      return route.fulfill({ json:{ requiereCodigo:true,method:'totp',destination:null,challengeId:'4f53207d-95d3-4796-a50b-e7b7d63a1e2c',expiresInSeconds:600 } });
    }
    if (url.pathname === '/api/auth/verificar') {
      verificationPayload = route.request().postDataJSON();
      return route.fulfill({ json:{ usuario:account } });
    }
    if (url.pathname.startsWith('/api/auth/')) return route.fulfill({ json:{ ok:true } });
    if (url.pathname === '/api/apartados') return route.fulfill({ json:[] });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json:[] });
    if (url.hostname === '127.0.0.1') return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({ contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>' });
    return route.fulfill({ contentType:'text/html',body:'<!doctype html><html lang="es"><title>Prueba</title><body></body></html>' });
  });

  await page.goto('/');
  await page.getByRole('button',{name:'Cuenta y preferencias'}).click();
  await page.locator('#panel-cuenta').getByRole('button',{name:'Iniciar sesión'}).click();
  await page.locator('#auth-email').fill('cliente@example.test');
  await page.locator('#auth-password').fill('clave-de-prueba');
  await expect(page.getByRole('radio')).toHaveCount(2);
  await expect(page.getByLabel('Enviar código al correo')).toBeChecked();
  await page.getByLabel('Usar código de la app autenticadora').check();
  await page.getByRole('button',{name:'Continuar con verificación'}).click();

  await expect(page.getByText('Abre tu app autenticadora y escribe el código actual de AutoPremium.')).toBeVisible();
  await page.getByLabel('Código de seis dígitos').fill('12a34567');
  await expect(page.getByLabel('Código de seis dígitos')).toHaveValue('123456');
  await page.getByRole('button',{name:'Verificar e iniciar sesión'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('usuario_premium') || 'null')?.email)).toBe(account.email);
  expect(loginPayload).toMatchObject({ email:'cliente@example.test',password:'clave-de-prueba',method:'totp' });
  expect(verificationPayload).toMatchObject({ challengeId:'4f53207d-95d3-4796-a50b-e7b7d63a1e2c',code:'123456' });
});

test('el registro requiere código de verificación de correo antes de crear sesión', async ({ page }) => {
  let registrationPayload;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/registro') {
      registrationPayload = route.request().postDataJSON();
      return route.fulfill({ status:201,json:{ requiereCodigo:true,requiereVerificacion:true,method:'email',destination:'c***@example.test',challengeId:'4f53207d-95d3-4796-a50b-e7b7d63a1e2c',expiresInSeconds:600 } });
    }
    if (url.pathname === '/api/auth/verificar') return route.fulfill({ json:{ usuario:account } });
    if (url.pathname.startsWith('/api/auth/')) return route.fulfill({ json:{ ok:true } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json:[] });
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.fulfill({ contentType:'text/html',body:'<!doctype html><html lang="es"><title>Prueba</title><body></body></html>' });
  });

  await page.goto('/');
  await page.getByRole('button',{name:'Cuenta y preferencias'}).click();
  await page.locator('#panel-cuenta').getByRole('button',{name:'Iniciar sesión'}).click();
  await page.getByRole('button',{name:'Regístrate aquí'}).click();
  await page.getByLabel('Nombre completo').fill('Cliente protegido');
  await page.locator('#auth-email').fill('cliente@example.test');
  await page.locator('#auth-password').fill('clave-segura-123');
  await page.getByLabel('Teléfono celular').fill('55 3046 7391');
  await page.getByRole('button',{name:'Crear cuenta y verificar correo'}).click();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Verifica tu correo'}).last()).toBeVisible();
  await expect(page.getByText('c***@example.test')).toBeVisible();
  expect(registrationPayload.telefono).toBe('55 3046 7391');
  expect(await page.evaluate(() => localStorage.getItem('usuario_premium'))).toBeNull();
  await page.getByLabel('Código de seis dígitos').fill('654321');
  await page.getByRole('button',{name:'Verificar e iniciar sesión'}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('usuario_premium') || 'null')?.email)).toBe(account.email);
});
