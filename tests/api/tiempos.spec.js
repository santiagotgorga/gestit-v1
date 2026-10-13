// HU-01 · reglas que dependen del tiempo (bloqueo de 15 min y expiración de sesión de 30 min).
// Para no esperar los tiempos reales, la app debe levantarse con tiempos cortos, por ejemplo:
//   SESSION_TIMEOUT_MIN=0.1 BLOQUEO_MIN=0.1 docker compose up -d    (6 segundos)
// y correr:  TIEMPO_SEG=6 npm run test:tiempos
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

const SEG = parseFloat(process.env.TIEMPO_SEG || '6');
const esperar = (s) => new Promise((r) => setTimeout(r, s * 1000));

test.describe.configure({ timeout: (SEG * 4 + 30) * 1000 });
test.beforeAll(() => h.resetDB());

test('CA-01.8 @tiempos vencido el bloqueo, la contraseña correcta permite ingresar', async () => {
  const ctx = await h.anonimo();
  for (let i = 0; i < 5; i++) await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } });
  expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } })).status()).toBe(423);
  await esperar(SEG + 1);
  expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } })).status()).toBe(200);
});

test('CA-01.8 @tiempos vencido el bloqueo, el contador vuelve a cero', async () => {
  const ctx = await h.anonimo();
  for (let i = 0; i < 5; i++) await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } });
  await esperar(SEG + 1);
  // un único fallo después del bloqueo no debe volver a bloquear
  expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } })).status()).toBe(401);
  expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } })).status()).toBe(200);
});

test('CA-01.10 @tiempos sin actividad la sesión expira y la API informa la expiración', async () => {
  const ctx = await h.sesion('operador');
  await esperar(SEG + 1);
  const r = await ctx.get('/api/equipos');
  expect(r.status()).toBe(401);
  expect(await r.json()).toMatchObject({ codigo: 'SESION_EXPIRADA', error: 'Tu sesión expiró por inactividad. Iniciá sesión nuevamente.' });
});

test('CA-01.10 @tiempos cada operación renueva el plazo', async () => {
  const ctx = await h.sesion('operador');
  for (let i = 0; i < 4; i++) {
    await esperar(SEG * 0.6);
    expect((await ctx.get('/api/equipos')).status(), `operación ${i + 1}`).toBe(200);
  }
});

test('CA-01.10 @tiempos en la interfaz, la siguiente acción lleva al login con «Tu sesión expiró por inactividad»', async ({ page }) => {
  await h.loginUI(page, 'operador');
  await esperar(SEG + 1);
  await page.getByTestId('link-ficha-EQ-000001').click();
  await expect(page).toHaveURL(/\/login\?motivo=expirada/);
  await expect(page.getByTestId('login-mensaje')).toContainText('Tu sesión expiró por inactividad');
});
