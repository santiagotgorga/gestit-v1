// Módulo Acceso y seguridad: HU-01, HU-02 y HU-03 (interfaz)
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

test.beforeAll(() => h.resetDB());

test.describe('HU-01 · Iniciar sesión (interfaz)', () => {
  test('CA-01.1 el Administrador ve su nombre, su rol y todas las opciones del menú', async ({ page }) => {
    await h.loginUI(page, 'admin');
    await expect(page).toHaveURL(/\/equipos$/);
    await expect(page.getByTestId('usuario-actual')).toHaveText('Administrador General');
    await expect(page.getByTestId('rol-actual')).toHaveText('Administrador');
    await expect(page.getByTestId('menu-principal').getByRole('link')).toHaveText(['Equipos', 'Categorías', 'Usuarios', 'Auditoría']);
  });

  test('CA-01.2 contraseña incorrecta: mensaje genérico, sigue en el login y la contraseña se vacía', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-usuario').fill('operador');
    await page.getByTestId('login-password').fill('Equivocada1');
    await page.getByTestId('login-ingresar').click();
    await expect(page.getByTestId('login-mensaje')).toHaveText(h.MSJ_CREDENCIALES);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('login-password')).toHaveValue('');
  });

  test('CA-01.3 / CA-01.4 usuario inexistente o desactivado: exactamente el mismo mensaje', async ({ page }) => {
    for (const [u, p] of [['noexiste', 'Cualquiera1'], ['inactivo', 'Inactivo1234']]) {
      await page.goto('/login');
      await page.getByTestId('login-usuario').fill(u);
      await page.getByTestId('login-password').fill(p);
      await page.getByTestId('login-ingresar').click();
      await expect(page.getByTestId('login-mensaje')).toHaveText(h.MSJ_CREDENCIALES);
    }
  });

  test('CA-01.5 campos vacíos: el error se indica junto a cada campo', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-ingresar').click();
    await expect(page.locator('[data-error=username]')).toHaveText('El usuario es obligatorio.');
    await expect(page.locator('[data-error=password]')).toHaveText('La contraseña es obligatoria.');
  });

  test('CA-01.11 una URL interna sin sesión lleva al login y, tras ingresar, vuelve a esa pantalla', async ({ page }) => {
    await page.goto('/equipos/EQ-000003');
    await expect(page).toHaveURL(/\/login\?motivo=requerida/);
    await expect(page.getByTestId('login-mensaje')).toContainText('Necesitás iniciar sesión');
    await page.getByTestId('login-usuario').fill('operador');
    await page.getByTestId('login-password').fill('Operador1234');
    await page.getByTestId('login-ingresar').click();
    await expect(page).toHaveURL(/\/equipos\/EQ-000003$/);
    await expect(page.getByTestId('ficha-codigo')).toHaveText('EQ-000003');
  });

  for (const destino of ['//evil.example', '/\\evil.example', '/\\/evil.example', 'https://evil.example']) {
    test(`Seguridad: «volver=${destino}» en el login no redirige a un sitio externo`, async ({ browser }) => {
      const ctx = await browser.newContext({ baseURL: h.BASE });
      await ctx.route((u) => u.hostname === 'evil.example', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>sitio externo</h1>' }));
      const page = await ctx.newPage();
      await page.goto('/login?volver=' + encodeURIComponent(destino));
      await page.getByTestId('login-usuario').fill('operador');
      await page.getByTestId('login-password').fill('Operador1234');
      await page.getByTestId('login-ingresar').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));
      expect(new URL(page.url()).host).toBe(new URL(h.BASE).host);
      await ctx.close();
    });
  }
});

test.describe('HU-02 · Cerrar sesión (interfaz)', () => {
  test('CA-02.1 cerrar sesión vuelve al login con el mensaje de confirmación', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await page.getByTestId('btn-cerrar-sesion').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('login-mensaje')).toHaveText('Cerraste sesión correctamente.');
  });

  test('CA-02.2 tras cerrar sesión, «Atrás» no muestra la pantalla anterior', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await page.goto('/equipos/EQ-000001');
    await expect(page.getByTestId('ficha-codigo')).toHaveText('EQ-000001');
    await page.getByTestId('btn-cerrar-sesion').click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('ficha-codigo')).toHaveCount(0);
  });
});

test.describe('HU-03 · Restringir funciones según el rol (interfaz)', () => {
  test('CA-03.1 el Operador solo ve «Equipos» en el menú', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await expect(page.getByTestId('rol-actual')).toHaveText('Operador');
    await expect(page.getByTestId('menu-principal').getByRole('link')).toHaveText(['Equipos']);
  });

  test('CA-03.2 en la ficha, el Operador no ve «Dar de baja» y el selector no ofrece «Baja»', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await page.goto('/equipos/EQ-000003');
    await expect(page.getByTestId('ficha-codigo')).toHaveText('EQ-000003');
    await expect(page.getByTestId('btn-dar-de-baja')).toBeHidden();
    await page.getByTestId('btn-cambiar-estado').click();
    await expect(page.getByTestId('select-nuevo-estado').locator('option')).toHaveText(['Seleccioná el nuevo estado', 'Asignado', 'En reparación']);
  });

  for (const ruta of ['/usuarios', '/categorias', '/auditoria']) {
    test(`CA-03.3 el Operador que escribe ${ruta} ve «Acceso denegado» sin datos`, async ({ page }) => {
      await h.loginUI(page, 'operador');
      const resp = await page.goto(ruta);
      expect(resp.status()).toBe(403);
      await expect(page.getByTestId('pantalla-sin-permiso')).toContainText('Acceso denegado');
      await expect(page.locator('table')).toHaveCount(0);
    });
  }

  test('CA-03.6 el Administrador puede abrir todas las secciones', async ({ page }) => {
    await h.loginUI(page, 'admin');
    for (const [menu, tabla] of [['menu-categorias', 'tabla-categorias'], ['menu-usuarios', 'tabla-usuarios'], ['menu-auditoria', 'tabla-auditoria'], ['menu-equipos', 'tabla-equipos']]) {
      await page.getByTestId(menu).click();
      await expect(page.getByTestId(tabla)).toBeVisible();
    }
  });
});
