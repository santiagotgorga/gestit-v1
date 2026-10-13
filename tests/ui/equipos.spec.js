// Módulo Gestión de equipos: HU-04 a HU-09 y HU-13 (interfaz)
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

test.beforeAll(() => h.resetDB());

test.describe('HU-04 · Registrar un equipo (interfaz)', () => {
  test.beforeEach(async ({ page }) => { await h.loginUI(page, 'operador'); });

  test('CA-04.1 un alta válida abre la ficha con el mensaje del código y estado Disponible', async ({ page }) => {
    await page.getByTestId('btn-nuevo-equipo').click();
    await page.getByTestId('equipo-marca').fill('Lenovo');
    await page.getByTestId('equipo-modelo').fill('IdeaPad 3');
    await page.getByTestId('equipo-serie').fill(h.serieUnica('UI'));
    await page.getByTestId('equipo-categoria').selectOption({ label: 'Notebook' });
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page).toHaveURL(/\/equipos\/EQ-\d{6}$/);
    const codigo = page.url().split('/').pop();
    await expect(page.getByTestId('ficha-mensaje')).toHaveText(`Equipo registrado con el código ${codigo}.`);
    await expect(page.getByTestId('ficha-estado')).toHaveText('Disponible');
    await expect(page.getByTestId('fila-historial')).toHaveCount(1);
  });

  test('CA-04.2 obligatorios vacíos o con espacios muestran un mensaje en cada campo', async ({ page }) => {
    await page.goto('/equipos/nuevo');
    await page.getByTestId('equipo-marca').fill('   ');
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page.getByTestId('error-marca')).toHaveText('La marca es obligatoria.');
    await expect(page.getByTestId('error-modelo')).toHaveText('El modelo es obligatorio.');
    await expect(page.getByTestId('error-numero-serie')).toHaveText('El número de serie es obligatorio.');
    await expect(page.getByTestId('error-categoria')).toHaveText('La categoría es obligatoria.');
    await expect(page).toHaveURL(/\/equipos\/nuevo$/);
  });

  test('CA-04.3 una serie duplicada muestra el mensaje con el código existente', async ({ page }) => {
    await page.goto('/equipos/nuevo');
    await page.getByTestId('equipo-marca').fill('Lenovo');
    await page.getByTestId('equipo-modelo').fill('Copia');
    await page.getByTestId('equipo-serie').fill('  pf3abc01 ');
    await page.getByTestId('equipo-categoria').selectOption({ label: 'Notebook' });
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page.getByTestId('form-equipo-mensaje')).toContainText('(EQ-000001)');
    await expect(page.getByTestId('error-numero-serie')).not.toBeEmpty();
  });

  test('CA-04.5 la lista de categorías del alta solo muestra las activas', async ({ page }) => {
    await page.goto('/equipos/nuevo');
    const opciones = page.getByTestId('equipo-categoria').locator('option');
    await expect(opciones).toHaveText(['Seleccioná una categoría', 'Celular', 'Desktop', 'Impresora', 'Monitor', 'Notebook', 'Periférico', 'Tablet']);
  });

  test('CA-04.7 los campos limitan la longitud máxima en el formulario', async ({ page }) => {
    await page.goto('/equipos/nuevo');
    for (const [id, max] of [['equipo-marca', 50], ['equipo-modelo', 80], ['equipo-serie', 50], ['equipo-observaciones', 500]]) {
      await expect(page.getByTestId(id)).toHaveAttribute('maxlength', String(max));
    }
  });

  test('CA-04.10 texto con HTML/JS se muestra literal y nunca se ejecuta (listado y ficha)', async ({ page }) => {
    const ataque = '<img src=x onerror="window.__xss=1">';
    const ctx = await h.sesion('operador');
    const codigo = await h.altaOk(ctx, { marca: ataque, modelo: '<script>window.__xss=2</script>', observaciones: '<b onmouseover="window.__xss=3">hola</b>' });
    await page.goto(`/equipos/${codigo}`);
    await expect(page.getByTestId('ficha-marca')).toHaveText(ataque);
    await expect(page.getByTestId('ficha-modelo')).toHaveText('<script>window.__xss=2</script>');
    await page.goto('/equipos?q=' + encodeURIComponent('<img'));
    await expect(page.getByTestId('fila-equipo')).toHaveCount(1);
    await expect(page.getByTestId('chip-filtro')).toHaveText('Texto: “<img”');
    await page.goto(`/equipos/${codigo}/editar`);
    await expect(page.getByTestId('equipo-marca')).toHaveValue(ataque);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });
});

test.describe('HU-05 / HU-13 · Editar los datos de un equipo (interfaz)', () => {
  test.beforeEach(async ({ page }) => { await h.loginUI(page, 'operador'); });

  test('CA-05.1 editar el modelo vuelve a la ficha con el mensaje y el dato actualizado', async ({ page }) => {
    await page.goto('/equipos/EQ-000003');
    await page.getByTestId('btn-editar-equipo').click();
    await expect(page.getByTestId('equipo-modelo')).toHaveValue('Latitude 5420');
    await page.getByTestId('equipo-modelo').fill('Latitude 5430');
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page).toHaveURL(/\/equipos\/EQ-000003$/);
    await expect(page.getByTestId('ficha-mensaje')).toHaveText('Cambios guardados correctamente.');
    await expect(page.getByTestId('ficha-modelo')).toHaveText('Latitude 5430');
  });

  test('CA-05.2 / CA-13.4 código y estado se muestran deshabilitados', async ({ page }) => {
    await page.goto('/equipos/EQ-000004/editar');
    await expect(page.getByTestId('equipo-codigo')).toHaveValue('EQ-000004');
    await expect(page.getByTestId('equipo-codigo')).toBeDisabled();
    await expect(page.getByTestId('equipo-estado')).toHaveValue('Asignado');
    await expect(page.getByTestId('equipo-estado')).toBeDisabled();
  });

  test('CA-05.4 vaciar un obligatorio muestra el error del campo', async ({ page }) => {
    await page.goto('/equipos/EQ-000005/editar');
    await expect(page.getByTestId('equipo-modelo')).not.toHaveValue('');
    await page.getByTestId('equipo-modelo').fill('');
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page.getByTestId('error-modelo')).toHaveText('El modelo es obligatorio.');
  });

  test('CA-05.5 / CA-09.6 la ficha de un equipo en Baja no ofrece editar, cambiar estado ni dar de baja', async ({ page }) => {
    await page.goto('/equipos/EQ-000011');
    await expect(page.getByTestId('ficha-estado')).toHaveText('Baja');
    await expect(page.getByTestId('btn-editar-equipo')).toBeHidden();
    await expect(page.getByTestId('btn-cambiar-estado')).toBeHidden();
    await expect(page.getByTestId('btn-dar-de-baja')).toBeHidden();
    await expect(page.getByTestId('fila-historial')).toHaveCount(3);
  });

  test('CA-05.6 abrir la edición de un equipo en Baja por URL muestra el rechazo', async ({ page }) => {
    await page.goto('/equipos/EQ-000011/editar');
    await expect(page.getByTestId('form-equipo-mensaje')).toHaveText('Un equipo dado de baja no admite edición.');
    await expect(page.getByTestId('btn-guardar-equipo')).toBeDisabled();
  });

  test('CA-05.7 guardar sin cambios informa que no hay cambios', async ({ page }) => {
    await page.goto('/equipos/EQ-000007/editar');
    await expect(page.getByTestId('equipo-marca')).toHaveValue('Ricoh');
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page.getByTestId('form-equipo-mensaje')).toHaveText('No se detectaron cambios para guardar.');
  });

  test('CA-05.8 un equipo con categoría desactivada la conserva al editar', async ({ page }) => {
    await page.goto('/equipos/EQ-000010/editar');
    await expect(page.getByTestId('equipo-categoria').locator('option:checked')).toHaveText('Proyector (desactivada)');
    await page.getByTestId('equipo-observaciones').fill('Lámpara cambiada');
    await page.getByTestId('btn-guardar-equipo').click();
    await expect(page.getByTestId('ficha-mensaje')).toHaveText('Cambios guardados correctamente.');
    await expect(page.getByTestId('ficha-categoria')).toHaveText('Proyector (desactivada)');
  });
});

test.describe('HU-06 · Consultar la ficha (interfaz)', () => {
  test.beforeEach(async ({ page }) => { await h.loginUI(page, 'operador'); });

  test('CA-06.1 hacer clic en el código del listado abre la ficha con todos los datos', async ({ page }) => {
    await page.getByTestId('link-ficha-EQ-000001').click();
    await expect(page).toHaveURL(/\/equipos\/EQ-000001$/);
    await expect(page.getByTestId('ficha-codigo')).toHaveText('EQ-000001');
    await expect(page.getByTestId('ficha-estado')).toHaveText('Asignado');
    await expect(page.getByTestId('ficha-marca')).toHaveText('Lenovo');
    await expect(page.getByTestId('ficha-modelo')).toHaveText('ThinkPad T14 Gen 3');
    await expect(page.getByTestId('ficha-serie')).toHaveText('PF3ABC01');
    await expect(page.getByTestId('ficha-categoria')).toHaveText('Notebook');
    await expect(page.getByTestId('ficha-observaciones')).toHaveText('Equipo de recepción');
    await expect(page.getByTestId('ficha-fecha-alta')).toHaveText('01/09/2026 09:00:00');
    await expect(page.getByTestId('ficha-fecha-ultimo-cambio')).toHaveText('01/09/2026 10:30:00');
  });

  test('CA-06.2 / CA-06.3 historial del más reciente al más antiguo, terminando en el alta', async ({ page }) => {
    await page.goto('/equipos/EQ-000008');
    const filas = page.getByTestId('fila-historial');
    await expect(filas).toHaveCount(3);
    await expect(filas.first().locator('td').first()).toHaveText(await page.getByTestId('ficha-fecha-ultimo-cambio').innerText());
    await expect(filas.last()).toContainText('—');
    await expect(filas.last()).toContainText('Alta del equipo en el inventario');
  });

  test('CA-06.4 /equipos/EQ-999999 muestra «no encontrado» (HTTP 404) sin errores técnicos', async ({ page }) => {
    const resp = await page.goto('/equipos/EQ-999999');
    await expect(page.getByTestId('ficha-mensaje')).toHaveText('No se encontró ningún equipo con el código «EQ-999999».');
    expect(resp.status(), 'código HTTP de la pantalla').toBe(404);
  });

  test('CA-06.6 una categoría desactivada se indica con «(desactivada)»', async ({ page }) => {
    await page.goto('/equipos/EQ-000010');
    await expect(page.getByTestId('ficha-categoria')).toHaveText('Proyector (desactivada)');
  });
});

test.describe('HU-07 · Buscar y filtrar (interfaz)', () => {
  test.beforeEach(async ({ page }) => { await h.loginUI(page, 'operador'); });

  test('CA-07.5 el listado inicial no muestra equipos en Baja', async ({ page }) => {
    await expect(page.getByTestId('fila-equipo').first()).toBeVisible();
    await expect(page.locator('[data-testid=fila-equipo] [data-testid=badge-estado]', { hasText: 'Baja' })).toHaveCount(0);
  });

  test('CA-07.6 «Incluir dados de baja» muestra las bajas', async ({ page }) => {
    await page.getByTestId('filtro-incluir-bajas').check();
    await expect(page.locator('[data-codigo="EQ-000011"]')).toBeVisible();
  });

  test('CA-07.4 / CA-07.8 texto, categoría y estado se combinan y se muestran como etiquetas', async ({ page }) => {
    await page.getByTestId('filtro-texto').fill('lenovo');
    await page.getByTestId('filtro-categoria').selectOption({ label: 'Notebook' });
    await page.getByTestId('filtro-estado').selectOption('Asignado');
    await page.getByTestId('btn-buscar').click();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(1);
    await expect(page.getByTestId('fila-equipo')).toHaveAttribute('data-codigo', 'EQ-000001');
    await expect(page.getByTestId('chip-filtro')).toHaveText(['Texto: “lenovo”', 'Categoría: Notebook', 'Estado: Asignado']);
  });

  test('CA-07.7 sin coincidencias se muestra el mensaje y no la tabla', async ({ page }) => {
    await page.getByTestId('filtro-texto').fill('zzzz');
    await page.getByTestId('btn-buscar').click();
    await expect(page.getByTestId('equipos-sin-resultados')).toContainText('No se encontraron equipos que coincidan con la búsqueda y los filtros aplicados');
    await expect(page.getByTestId('tabla-equipos')).toBeHidden();
  });

  test('CA-07.9 «Limpiar filtros» vacía todo con una sola acción', async ({ page }) => {
    await page.goto('/equipos?q=zzzz&estado=Asignado&incluirBajas=1');
    await expect(page.getByTestId('chip-filtro')).toHaveCount(3);
    await page.getByTestId('btn-limpiar-filtros').click();
    await expect(page.getByTestId('chip-filtro')).toHaveCount(0);
    await expect(page.getByTestId('filtro-texto')).toHaveValue('');
    await expect(page.getByTestId('filtro-estado')).toHaveValue('');
    await expect(page.getByTestId('filtro-incluir-bajas')).not.toBeChecked();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(11);
    await expect(page).toHaveURL(/\/equipos$/);
  });

  test('CA-07.10 / CA-07.11 paginación: con 51 resultados, 50 por página con «Página X de Y»', async ({ page }) => {
    const ctx = await h.sesion('operador');
    const total = (await (await ctx.get('/api/equipos')).json()).total;
    for (let i = total; i < 50; i++) await h.altaOk(ctx, { marca: 'Paginado' });
    await page.reload();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(50);
    await expect(page.getByTestId('equipos-siguiente')).toHaveCount(0);
    await h.altaOk(ctx, { marca: 'Paginado' });
    await page.reload();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(50);
    await expect(page.getByTestId('equipos-total')).toContainText('Página 1 de 2');
    await expect(page.getByTestId('equipos-anterior')).toBeDisabled();
    await page.getByTestId('equipos-siguiente').click();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(1);
    await expect(page.getByTestId('equipos-total')).toContainText('Página 2 de 2');
    await expect(page.getByTestId('equipos-siguiente')).toBeDisabled();
    await page.getByTestId('equipos-anterior').click();
    await expect(page.getByTestId('fila-equipo')).toHaveCount(50);
  });
});

test.describe('HU-08 · Cambiar el estado (interfaz)', () => {
  test.beforeEach(() => h.resetDB());

  test('CA-08.1 / CA-08.2 / CA-08.3 el selector solo ofrece estados alcanzables', async ({ page }) => {
    await h.loginUI(page, 'operador');
    for (const [codigo, ops] of [['EQ-000003', ['Asignado', 'En reparación']], ['EQ-000004', ['Disponible', 'En reparación']], ['EQ-000002', ['Disponible']]]) {
      await page.goto(`/equipos/${codigo}`);
      await page.getByTestId('btn-cambiar-estado').click();
      await expect(page.getByTestId('select-nuevo-estado').locator('option')).toHaveText(['Seleccioná el nuevo estado', ...ops]);
    }
  });

  test('CA-08.4 Disponible → Asignado: mensaje de éxito y nueva fila al tope del historial', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await page.goto('/equipos/EQ-000003');
    await page.getByTestId('btn-cambiar-estado').click();
    await page.getByTestId('select-nuevo-estado').selectOption('Asignado');
    await page.getByTestId('input-motivo').fill('Entrega a nueva empleada de RRHH');
    await expect(page.getByTestId('contador-motivo')).toHaveText('32');
    await page.getByTestId('btn-confirmar-estado').click();
    await expect(page.getByTestId('ficha-mensaje')).toHaveText('Estado actualizado: «Disponible» → «Asignado».');
    await expect(page.getByTestId('ficha-estado')).toHaveText('Asignado');
    const primera = page.getByTestId('fila-historial').first();
    await expect(primera).toContainText('Entrega a nueva empleada de RRHH');
    await expect(primera).toContainText('operador');
    await expect(page.getByTestId('fila-historial')).toHaveCount(2);
  });

  test('CA-08.5 un motivo corto muestra el error y el estado no cambia', async ({ page }) => {
    await h.loginUI(page, 'operador');
    await page.goto('/equipos/EQ-000003');
    await page.getByTestId('btn-cambiar-estado').click();
    await page.getByTestId('select-nuevo-estado').selectOption('Asignado');
    await page.getByTestId('input-motivo').fill('corto');
    await page.getByTestId('btn-confirmar-estado').click();
    await expect(page.getByTestId('error-motivo')).toHaveText('El motivo debe tener entre 10 y 500 caracteres.');
    await page.getByTestId('btn-cancelar-estado').click();
    await expect(page.getByTestId('ficha-estado')).toHaveText('Disponible');
  });

  test('CA-08.9 dos usuarios con la ficha abierta: el segundo ve el conflicto y «Recargar ficha»', async ({ browser }) => {
    const [c1, c2] = await Promise.all([browser.newContext({ baseURL: h.BASE }), browser.newContext({ baseURL: h.BASE })]);
    const [p1, p2] = await Promise.all([c1.newPage(), c2.newPage()]);
    await h.loginUI(p1, 'operador');
    await h.loginUI(p2, 'operador2');
    for (const p of [p1, p2]) {
      await p.goto('/equipos/EQ-000009');
      await expect(p.getByTestId('ficha-estado')).toHaveText('Disponible');
      await p.getByTestId('btn-cambiar-estado').click();
    }
    await p1.getByTestId('select-nuevo-estado').selectOption('Asignado');
    await p1.getByTestId('input-motivo').fill('Primer usuario asigna el teclado');
    await p1.getByTestId('btn-confirmar-estado').click();
    await expect(p1.getByTestId('ficha-estado')).toHaveText('Asignado');
    await p2.getByTestId('select-nuevo-estado').selectOption('En reparación');
    await p2.getByTestId('input-motivo').fill('Segundo usuario lo manda a reparar');
    await p2.getByTestId('btn-confirmar-estado').click();
    await expect(p2.getByTestId('modal-mensaje')).toContainText('Otro usuario modificó el estado de este equipo');
    await expect(p2.getByTestId('btn-recargar-ficha')).toBeVisible();
    await p2.getByTestId('btn-recargar-ficha').click();
    await expect(p2.getByTestId('ficha-estado')).toHaveText('Asignado');
    await expect(p2.getByTestId('fila-historial')).toHaveCount(2);
    await Promise.all([c1.close(), c2.close()]);
  });
});

test.describe('HU-09 · Dar de baja (interfaz)', () => {
  test.beforeEach(async ({ page }) => { h.resetDB(); await h.loginUI(page, 'admin'); });

  async function abrirBaja(page, codigo) {
    await page.goto(`/equipos/${codigo}`);
    await page.getByTestId('btn-dar-de-baja').click();
    await page.getByTestId('input-motivo').fill('Equipo obsoleto, se descarta');
    await page.getByTestId('btn-confirmar-estado').click();
    await expect(page.getByTestId('modal-confirmacion')).toContainText('¿Confirmás la baja?');
  }

  test('CA-09.1 baja confirmada: estado Baja y mensaje', async ({ page }) => {
    await abrirBaja(page, 'EQ-000003');
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('ficha-mensaje')).toHaveText('El equipo EQ-000003 fue dado de baja.');
    await expect(page.getByTestId('ficha-estado')).toHaveText('Baja');
    await expect(page.getByTestId('btn-editar-equipo')).toBeHidden();
  });

  test('CA-09.2 «Cancelar» en el diálogo no produce cambios', async ({ page }) => {
    await abrirBaja(page, 'EQ-000003');
    await page.getByTestId('btn-confirmar-cancelar').click();
    await page.getByTestId('btn-cancelar-estado').click();
    await page.reload();
    await expect(page.getByTestId('ficha-estado')).toHaveText('Disponible');
    await expect(page.getByTestId('fila-historial')).toHaveCount(1);
  });

  test('CA-09.3 en un equipo Asignado, «Dar de baja» está deshabilitado con el aviso', async ({ page }) => {
    await page.goto('/equipos/EQ-000004');
    await expect(page.getByTestId('btn-dar-de-baja')).toBeVisible();
    await expect(page.getByTestId('btn-dar-de-baja')).toBeDisabled();
    await expect(page.getByTestId('aviso-baja')).toHaveText(/^Para dar de baja este equipo primero registrá su devolución/);
  });

  test('CA-09.1 el Administrador puede dar de baja un equipo En reparación', async ({ page }) => {
    await abrirBaja(page, 'EQ-000002');
    await page.getByTestId('btn-confirmar-aceptar').click();
    await expect(page.getByTestId('ficha-estado')).toHaveText('Baja');
  });
});
