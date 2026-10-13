// Módulo Configuración y control: HU-10, HU-11 y HU-12 (interfaz)
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

test.beforeAll(() => h.resetDB());
test.beforeEach(async ({ page }) => { await h.loginUI(page, 'admin'); });

test.describe('HU-10 · Categorías (interfaz)', () => {
  test('CA-10.1 crear «Servidor»: aparece activa, con 0 equipos, y se ofrece en el alta', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('categoria-nombre').fill('Servidor');
    await page.getByTestId('btn-crear-categoria').click();
    await expect(page.getByTestId('categorias-mensaje')).toHaveText('Categoría «Servidor» creada.');
    const fila = page.locator('[data-testid=fila-categoria][data-nombre="Servidor"]');
    await expect(fila).toContainText('Activa');
    await expect(fila.locator('td').nth(2)).toHaveText('0');
    await page.goto('/equipos/nuevo');
    await expect(page.getByTestId('equipo-categoria').locator('option', { hasText: 'Servidor' })).toHaveCount(1);
  });

  test('CA-10.2 / CA-10.3 nombre repetido o de 1 carácter muestra el error', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('categoria-nombre').fill('notebook');
    await page.getByTestId('btn-crear-categoria').click();
    await expect(page.getByTestId('categorias-mensaje')).toHaveText('Ya existe una categoría con el nombre «Notebook».');
    await page.getByTestId('categoria-nombre').fill('A');
    await page.getByTestId('btn-crear-categoria').click();
    await expect(page.getByTestId('error-categoria-nombre')).toHaveText('El nombre debe tener al menos 2 caracteres.');
  });

  test('CA-10.4 renombrar se refleja en el listado de equipos', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('btn-renombrar-Impresora').click();
    await page.getByTestId('input-nuevo-nombre').fill('Impresora láser');
    await page.getByTestId('btn-guardar-renombrar').click();
    await expect(page.getByTestId('categorias-mensaje')).toHaveText('Categoría renombrada a «Impresora láser».');
    await page.goto('/equipos?q=EQ-000007');
    await expect(page.locator('[data-codigo="EQ-000007"]')).toContainText('Impresora láser');
  });

  test('CA-10.5 desactivar pide confirmación y la categoría deja de ofrecerse en el alta', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('btn-desactivar-Tablet').click();
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('categorias-mensaje')).toHaveText('Categoría «Tablet» desactivada.');
    await expect(page.getByTestId('btn-activar-Tablet')).toBeVisible();
    await page.goto('/equipos/nuevo');
    await expect(page.getByTestId('equipo-categoria').locator('option', { hasText: 'Tablet' })).toHaveCount(0);
    await page.goto('/equipos/EQ-000012');
    await expect(page.getByTestId('ficha-categoria')).toHaveText('Tablet (desactivada)');
  });

  test('CA-10.6 eliminar una categoría con equipos muestra el rechazo', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('btn-eliminar-Notebook').click();
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('categorias-mensaje')).toContainText('No se puede eliminar la categoría «Notebook» porque tiene 4 equipo(s) asociado(s).');
  });

  test('CA-10.7 una categoría sin equipos se elimina tras confirmar', async ({ page }) => {
    await page.goto('/categorias');
    await page.getByTestId('categoria-nombre').fill('Para borrar');
    await page.getByTestId('btn-crear-categoria').click();
    await page.getByTestId('btn-eliminar-Para borrar').click();
    await expect(page.getByTestId('modal-confirmacion')).toBeVisible();
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('categorias-mensaje')).toHaveText('Categoría «Para borrar» eliminada.');
    await expect(page.locator('[data-testid=fila-categoria][data-nombre="Para borrar"]')).toHaveCount(0);
  });
});

test.describe('HU-11 · Usuarios (interfaz)', () => {
  test('CA-11.1 crear un Operador: aparece activo y puede iniciar sesión', async ({ page, browser }) => {
    await page.goto('/usuarios');
    await page.getByTestId('usuario-username').fill('tecnico1');
    await page.getByTestId('usuario-nombre').fill('Técnico Uno');
    await page.getByTestId('usuario-rol').selectOption('Operador');
    await page.getByTestId('usuario-password').fill('abcdefg1');
    await page.getByTestId('btn-crear-usuario').click();
    await expect(page.getByTestId('usuarios-mensaje')).toHaveText('Usuario «tecnico1» creado.');
    await expect(page.locator('[data-testid=fila-usuario][data-username="tecnico1"]')).toContainText('Activo');
    const ctx = await browser.newContext({ baseURL: h.BASE });
    const p2 = await ctx.newPage();
    await h.loginUI(p2, 'tecnico1', 'abcdefg1');
    await expect(p2.getByTestId('rol-actual')).toHaveText('Operador');
    await ctx.close();
  });

  test('CA-11.3 / CA-11.4 los errores se indican junto a cada campo', async ({ page }) => {
    await page.goto('/usuarios');
    await page.getByTestId('usuario-username').fill('ab');
    await page.getByTestId('usuario-password').fill('abcdefgh');
    await page.getByTestId('btn-crear-usuario').click();
    await expect(page.getByTestId('error-username')).not.toBeEmpty();
    await expect(page.getByTestId('error-nombre')).toHaveText('El nombre y apellido es obligatorio.');
    await expect(page.getByTestId('error-rol')).toHaveText('Seleccioná un rol válido.');
    await expect(page.getByTestId('error-password')).toHaveText('La contraseña debe incluir al menos un número.');
  });

  test('CA-11.5 la lista de usuarios no muestra contraseñas', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page.getByTestId('fila-usuario').first()).toBeVisible();
    await expect(page.getByTestId('tabla-usuarios')).not.toContainText(/Admin1234|\$2[aby]\$/);
    await expect(page.locator('th')).not.toContainText(['Contraseña']);
  });

  test('CA-11.7 desactivar pide confirmación y el usuario afectado vuelve al login en su siguiente acción', async ({ page, browser }) => {
    const ctx = await browser.newContext({ baseURL: h.BASE });
    const p2 = await ctx.newPage();
    await h.loginUI(p2, 'operador2');
    await page.goto('/usuarios');
    await page.getByTestId('btn-desactivar-operador2').click();
    await expect(page.getByTestId('modal-confirmacion')).toContainText('perderá el acceso');
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('usuarios-mensaje')).toHaveText('Usuario «operador2» desactivado.');
    await p2.getByTestId('link-ficha-EQ-000001').click();
    await expect(p2).toHaveURL(/\/login/);
    await ctx.close();
  });

  test('CA-11.9 el Administrador no puede desactivarse a sí mismo', async ({ page }) => {
    await page.goto('/usuarios');
    await page.getByTestId('btn-desactivar-admin').click();
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('usuarios-mensaje')).toHaveText('No se puede desactivar al último Administrador activo del sistema.');
  });

  test('CA-11.10 el Administrador no puede cambiar su propio rol', async ({ page }) => {
    await page.goto('/usuarios');
    await page.getByTestId('btn-editar-admin').click();
    await page.getByTestId('editar-rol').selectOption('Operador');
    await page.getByTestId('btn-guardar-editar-usuario').click();
    await expect(page.getByTestId('modal-mensaje')).toHaveText('No podés cambiar tu propio rol.');
  });
});

test.describe('HU-12 · Auditoría (interfaz)', () => {
  test('CA-12.1 / CA-12.9 la tabla muestra las columnas pedidas y no ofrece editar ni eliminar', async ({ page }) => {
    await page.goto('/auditoria');
    await expect(page.getByTestId('tabla-auditoria').locator('th')).toHaveText(['Fecha y hora', 'Usuario', 'Acción', 'Entidad', 'Identificador', 'Detalle']);
    await expect(page.getByTestId('fila-auditoria').first().locator('td').first()).toHaveText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    await expect(page.getByTestId('tabla-auditoria').getByRole('button')).toHaveCount(0);
  });

  test('CA-12.2 una edición muestra «campo: anterior → nuevo»', async ({ page }) => {
    const op = await h.sesion('operador');
    const e = (await h.ficha(op, 'EQ-000005')).equipo;
    await op.put('/api/equipos/EQ-000005', { data: { ...e, observaciones: 'Golpe en la base' } });
    await page.goto('/auditoria');
    await page.getByTestId('filtro-accion').selectOption('MODIFICACION');
    await page.getByTestId('filtro-entidad').selectOption('EQUIPO');
    await page.getByTestId('btn-filtrar-auditoria').click();
    await expect(page.getByTestId('fila-auditoria').first()).toContainText('observaciones: — → Golpe en la base');
  });

  test('CA-12.5 filtrar un solo día trae solo registros de ese día', async ({ page }) => {
    await page.goto('/auditoria');
    await page.getByTestId('filtro-desde').fill('2026-09-01');
    await page.getByTestId('filtro-hasta').fill('2026-09-01');
    await page.getByTestId('btn-filtrar-auditoria').click();
    await expect(page.getByTestId('fila-auditoria')).toHaveCount(2);
    for (const t of await page.getByTestId('fila-auditoria').locator('td:first-child').allInnerTexts()) expect(t.startsWith('01/09/2026')).toBe(true);
  });

  test('CA-12.6 «Desde» posterior a «Hasta» informa que el rango no es válido', async ({ page }) => {
    await page.goto('/auditoria');
    await page.getByTestId('filtro-desde').fill('2026-09-10');
    await page.getByTestId('filtro-hasta').fill('2026-09-01');
    await page.getByTestId('btn-filtrar-auditoria').click();
    await expect(page.getByTestId('auditoria-mensaje')).toHaveText('La fecha «desde» no puede ser posterior a la fecha «hasta».');
  });

  test('CA-12.8 filtros sin coincidencias muestran el mensaje', async ({ page }) => {
    await page.goto('/auditoria');
    await page.getByTestId('filtro-usuario').selectOption('operador');
    await page.getByTestId('filtro-accion').selectOption('BAJA');
    await page.getByTestId('btn-filtrar-auditoria').click();
    await expect(page.getByTestId('auditoria-sin-resultados')).toHaveText('No hay registros de auditoría que coincidan con los filtros aplicados.');
    await expect(page.getByTestId('tabla-auditoria')).toBeHidden();
  });

  test('CA-12.12 con más de 50 registros se pagina de a 50', async ({ page }) => {
    await page.goto('/auditoria');
    await expect(page.getByTestId('fila-auditoria').first()).toBeVisible();
    const n = await page.getByTestId('fila-auditoria').count();
    if (n < 50) {
      const anon = await h.anonimo();
      for (let i = n; i <= 55; i++) await anon.post('/api/login', { data: { username: `relleno${i}`, password: 'x' } });
      await page.reload();
    }
    await expect(page.getByTestId('fila-auditoria')).toHaveCount(50);
    await expect(page.getByTestId('auditoria-total')).toContainText('Página 1 de');
    await page.getByTestId('auditoria-siguiente').click();
    await expect(page.getByTestId('auditoria-pagina')).toHaveText('2');
  });
});
