// Módulo Gestión de equipos: HU-04, HU-13, HU-05 y HU-06 (API)
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

const FECHA = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
let op;
let admin;

test.beforeAll(async () => {
  h.resetDB();
  op = await h.sesion('operador');
  admin = await h.sesion('admin');
});

test.describe('HU-13 · Generar el código de inventario', () => {
  test('CA-13.1 con el último código EQ-000012, el alta siguiente recibe EQ-000013', async () => {
    const r = await h.altaEquipo(op);
    expect(r.status()).toBe(201);
    expect((await r.json()).codigo).toBe('EQ-000013');
  });

  test('CA-13.2 un alta rechazada no consume número', async () => {
    const antes = await h.altaOk(op);
    const rech = await h.altaEquipo(op, { numero_serie: 'PF3ABC01' });
    expect(rech.status()).toBe(409);
    const rech2 = await h.altaEquipo(op, { marca: '' });
    expect(rech2.status()).toBe(400);
    const despues = await h.altaOk(op);
    expect(parseInt(despues.slice(3), 10)).toBe(parseInt(antes.slice(3), 10) + 1);
  });

  test('CA-13.3 el código de un equipo dado de baja (EQ-000011) no se reutiliza', async () => {
    const lista = await (await op.get('/api/equipos?incluirBajas=1&q=EQ-0000')).json();
    const codigos = lista.equipos.map((e) => e.codigo);
    expect(codigos.filter((c) => c === 'EQ-000011').length).toBe(1);
    expect(await h.altaOk(op)).not.toBe('EQ-000011');
  });

  test('CA-13.4 / CA-13.6 un código o estado enviados por el cliente se ignoran', async () => {
    const r = await h.altaEquipo(op, { codigo: 'EQ-999999', estado: 'Asignado' });
    expect(r.status()).toBe(201);
    const b = await r.json();
    expect(b.codigo).not.toBe('EQ-999999');
    expect(b.codigo).toMatch(/^EQ-\d{6}$/);
    const f = await h.ficha(op, b.codigo);
    expect(f.equipo.estado).toBe('Disponible');
    // edición: el código enviado se ignora
    const e = f.equipo;
    const put = await op.put(`/api/equipos/${e.codigo}`, {
      data: { codigo: 'EQ-000001', estado: 'Baja', marca: e.marca, modelo: 'Otro modelo', numero_serie: e.numero_serie, categoria_id: e.categoria_id },
    });
    expect(put.status()).toBe(200);
    const f2 = await h.ficha(op, e.codigo);
    expect(f2.equipo.codigo).toBe(e.codigo);
    expect(f2.equipo.estado).toBe('Disponible');
  });

  test('CA-13.5 altas simultáneas reciben códigos distintos y correlativos', async () => {
    const otros = await Promise.all([h.sesion('operador2'), h.sesion('admin')]);
    const ctxs = [op, ...otros];
    const resp = await Promise.all(Array.from({ length: 12 }, (_, i) => h.altaEquipo(ctxs[i % 3])));
    const codigos = [];
    for (const r of resp) { expect(r.status()).toBe(201); codigos.push((await r.json()).codigo); }
    const nums = codigos.map((c) => parseInt(c.slice(3), 10)).sort((a, b) => a - b);
    expect(new Set(nums).size).toBe(12);
    expect(nums[11] - nums[0]).toBe(11);
  });
});

test.describe('HU-04 · Registrar un equipo', () => {
  test('CA-04.1 un alta válida crea el equipo en estado Disponible con el mensaje del código', async () => {
    const r = await h.altaEquipo(op, { marca: 'Dell', modelo: 'Vostro 3520', numero_serie: h.serieUnica('ALTA') });
    expect(r.status()).toBe(201);
    const b = await r.json();
    expect(b.mensaje).toBe(`Equipo registrado con el código ${b.codigo}.`);
    expect(b.estado).toBe('Disponible');
  });

  test('CA-04.2 obligatorios vacíos o con solo espacios: no se crea y cada campo informa su error', async () => {
    const antes = (await (await op.get('/api/equipos?incluirBajas=1')).json()).total;
    const r = await op.post('/api/equipos', { data: { marca: '   ', modelo: '', numero_serie: '  ', categoria_id: '' } });
    expect(r.status()).toBe(400);
    const { campos } = await r.json();
    expect(campos).toEqual({
      marca: 'La marca es obligatoria.',
      modelo: 'El modelo es obligatorio.',
      numero_serie: 'El número de serie es obligatorio.',
      categoria_id: 'La categoría es obligatoria.',
    });
    expect((await (await op.get('/api/equipos?incluirBajas=1')).json()).total).toBe(antes);
  });

  for (const serie of ['pf3abc01', '  PF3ABC01  ', 'Pf3AbC01']) {
    test(`CA-04.3 número de serie duplicado sin distinguir mayúsculas ni espacios («${serie}»)`, async () => {
      const r = await h.altaEquipo(op, { numero_serie: serie });
      expect(r.status()).toBe(409);
      const b = await r.json();
      expect(b.error).toMatch(/^Ya existe un equipo con el número de serie .*\(EQ-000001\)\.$/);
      expect(b.campos.numero_serie).toBeTruthy();
    });
  }

  test('CA-04.4 / CA-09.8 la serie de un equipo dado de baja sigue bloqueada', async () => {
    const r = await h.altaEquipo(op, { numero_serie: 'HPEB-840-0011' });
    expect(r.status()).toBe(409);
    expect((await r.json()).error).toContain('(EQ-000011)');
  });

  test('CA-04.5 el alta solo ofrece categorías activas', async () => {
    const activas = await h.categorias(op, false);
    expect(activas.every((c) => c.activa)).toBe(true);
    expect(activas.map((c) => c.nombre)).not.toContain('Proyector');
  });

  test('CA-04.6 una categoría desactivada se rechaza por API con error en el campo categoría', async () => {
    const r = await h.altaEquipo(op, { categoria_id: await h.categoriaId(op, 'Proyector') });
    expect(r.status()).toBe(400);
    expect((await r.json()).campos.categoria_id).toBeTruthy();
  });

  test('CA-04.6 una categoría inexistente se rechaza con error en el campo categoría', async () => {
    const r = await h.altaEquipo(op, { categoria_id: 99999 });
    expect(r.status()).toBe(400);
    expect((await r.json()).campos.categoria_id).toBeTruthy();
  });

  test('Robustez: un id de categoría fuera de rango se rechaza como dato inválido, sin error 500', async () => {
    const r = await h.altaEquipo(op, { categoria_id: '99999999999' });
    expect(r.status()).toBe(400);
  });

  const LIMITES = [['marca', 50, 'La marca no puede superar los 50 caracteres.'], ['modelo', 80, 'El modelo no puede superar los 80 caracteres.'],
    ['numero_serie', 50, 'El número de serie no puede superar los 50 caracteres.'], ['observaciones', 500, 'Las observaciones no pueden superar los 500 caracteres.']];
  for (const [campo, max, msj] of LIMITES) {
    test(`CA-04.7 ${campo}: ${max} caracteres se acepta y ${max + 1} se rechaza indicando el límite`, async () => {
      const largo = (n) => (campo === 'numero_serie' ? h.serieUnica('L') : '').padEnd(n, 'X');
      const ok = await h.altaEquipo(op, { [campo]: largo(max) });
      expect(ok.status(), 'valor límite').toBe(201);
      const mal = await h.altaEquipo(op, { [campo]: largo(max + 1) });
      expect(mal.status()).toBe(400);
      expect((await mal.json()).campos[campo]).toBe(msj);
    });
  }

  test('CA-04.8 los espacios al inicio y al final no se guardan', async () => {
    const serie = h.serieUnica('TRIM');
    const codigo = await h.altaOk(op, { marca: '  Asus  ', modelo: '\tVivoBook 15 ', numero_serie: `  ${serie}  `, observaciones: '  nota  ' });
    const { equipo } = await h.ficha(op, codigo);
    expect(equipo).toMatchObject({ marca: 'Asus', modelo: 'VivoBook 15', numero_serie: serie, observaciones: 'nota' });
  });

  test('CA-04.9 el alta registra el historial «— → Disponible» y la auditoría ALTA con los datos', async () => {
    const serie = h.serieUnica('AUD');
    const codigo = await h.altaOk(op, { marca: 'Acer', modelo: 'Aspire 5', numero_serie: serie });
    const { historial } = await h.ficha(op, codigo);
    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ estado_anterior: null, estado_nuevo: 'Disponible', usuario: 'operador', motivo: 'Alta del equipo en el inventario' });
    const reg = (await h.auditoria(admin, { accion: 'ALTA', entidad: 'EQUIPO' })).registros.find((x) => x.identificador === codigo);
    expect(reg.usuario).toBe('operador');
    expect(reg.detalle).toMatchObject({ marca: 'Acer', modelo: 'Aspire 5', numero_serie: serie, categoria: 'Notebook', estado: 'Disponible' });
  });

  test('CA-04.10 el texto con HTML se guarda literal (la no ejecución se prueba en la interfaz)', async () => {
    const codigo = await h.altaOk(op, { marca: '<script>alert(1)</script>', observaciones: '"comillas" & <b>negrita</b> ñ á 😀' });
    const { equipo } = await h.ficha(op, codigo);
    expect(equipo.marca).toBe('<script>alert(1)</script>');
    expect(equipo.observaciones).toBe('"comillas" & <b>negrita</b> ñ á 😀');
  });
});

test.describe('HU-05 · Editar los datos de un equipo', () => {
  async function datos(codigo) {
    const e = (await h.ficha(op, codigo)).equipo;
    return { marca: e.marca, modelo: e.modelo, numero_serie: e.numero_serie, categoria_id: e.categoria_id, observaciones: e.observaciones || '' };
  }

  for (const [codigo, estado] of [['EQ-000003', 'Disponible'], ['EQ-000004', 'Asignado'], ['EQ-000002', 'En reparación']]) {
    test(`CA-05.1 se edita el modelo de un equipo ${estado}`, async () => {
      const d = await datos(codigo);
      const r = await op.put(`/api/equipos/${codigo}`, { data: { ...d, modelo: d.modelo + ' (editado)' } });
      expect(r.status()).toBe(200);
      expect((await r.json()).mensaje).toBe('Cambios guardados correctamente.');
      const f = await h.ficha(op, codigo);
      expect(f.equipo.modelo).toBe(d.modelo + ' (editado)');
      expect(f.equipo.estado).toBe(estado);
    });
  }

  test('CA-05.3 cambiar la serie a una existente (otra capitalización) se rechaza y no guarda nada', async () => {
    const d = await datos('EQ-000003');
    const r = await op.put('/api/equipos/EQ-000003', { data: { ...d, modelo: 'No debería guardarse', numero_serie: 'pf3abc01' } });
    expect(r.status()).toBe(409);
    expect((await r.json()).error).toContain('(EQ-000001)');
    expect(await datos('EQ-000003')).toEqual(d);
  });

  test('CA-05.3 cambiar solo la capitalización de la propia serie se permite', async () => {
    const codigo = await h.altaOk(op, { numero_serie: 'propia-serie-1' });
    const d = await datos(codigo);
    const r = await op.put(`/api/equipos/${codigo}`, { data: { ...d, numero_serie: 'PROPIA-SERIE-1' } });
    expect(r.status()).toBe(200);
  });

  test('CA-05.4 vaciar un obligatorio se rechaza indicando el campo', async () => {
    const d = await datos('EQ-000005');
    const r = await op.put('/api/equipos/EQ-000005', { data: { ...d, marca: '   ' } });
    expect(r.status()).toBe(400);
    expect((await r.json()).campos.marca).toBe('La marca es obligatoria.');
  });

  test('CA-05.6 un equipo dado de baja no admite edición por API', async () => {
    const d = await datos('EQ-000011');
    const r = await op.put('/api/equipos/EQ-000011', { data: { ...d, modelo: 'Cambio' } });
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toBe('Un equipo dado de baja no admite edición.');
  });

  test('CA-05.7 guardar sin cambios informa y no genera auditoría', async () => {
    const antes = (await h.auditoria(admin, { accion: 'MODIFICACION', entidad: 'EQUIPO' })).total;
    const r = await op.put('/api/equipos/EQ-000007', { data: await datos('EQ-000007') });
    expect(r.status()).toBe(200);
    expect((await r.json()).mensaje).toBe('No se detectaron cambios para guardar.');
    expect((await h.auditoria(admin, { accion: 'MODIFICACION', entidad: 'EQUIPO' })).total).toBe(antes);
  });

  test('CA-05.7 agregar solo espacios a un campo no cuenta como cambio', async () => {
    const d = await datos('EQ-000007');
    const r = await op.put('/api/equipos/EQ-000007', { data: { ...d, marca: ` ${d.marca}  ` } });
    expect((await r.json()).sinCambios).toBe(true);
  });

  test('CA-05.8 un equipo con categoría desactivada la conserva al editar otros campos', async () => {
    const d = await datos('EQ-000010');
    const r = await op.put('/api/equipos/EQ-000010', { data: { ...d, observaciones: 'Observación nueva' } });
    expect(r.status()).toBe(200);
    const f = await h.ficha(op, 'EQ-000010');
    expect(f.equipo.categoria).toBe('Proyector');
    expect(f.equipo.categoria_activa).toBe(false);
  });

  test('HU-05 regla: no se puede pasar un equipo a otra categoría desactivada', async () => {
    const d = await datos('EQ-000003');
    const r = await op.put('/api/equipos/EQ-000003', { data: { ...d, categoria_id: await h.categoriaId(op, 'Proyector') } });
    expect(r.status()).toBe(400);
    expect((await r.json()).campos.categoria_id).toBeTruthy();
  });

  test('CA-05.9 la auditoría MODIFICACION guarda anterior → nuevo de cada campo cambiado', async () => {
    const d = await datos('EQ-000009');
    await op.put('/api/equipos/EQ-000009', { data: { ...d, modelo: 'MX Keys S', observaciones: 'Teclado nuevo' } });
    const reg = (await h.auditoria(admin, { accion: 'MODIFICACION', entidad: 'EQUIPO' })).registros.find((x) => x.identificador === 'EQ-000009');
    expect(reg.detalle).toEqual({
      modelo: { anterior: 'MX Keys', nuevo: 'MX Keys S' },
      observaciones: { anterior: null, nuevo: 'Teclado nuevo' },
    });
  });

  test('Editar un código inexistente responde 404', async () => {
    const d = await datos('EQ-000003');
    expect((await op.put('/api/equipos/EQ-999999', { data: d })).status()).toBe(404);
  });
});

test.describe('HU-06 · Consultar la ficha de un equipo', () => {
  test('CA-06.1 la ficha incluye todos los datos enumerados', async () => {
    const { equipo } = await h.ficha(op, 'EQ-000001');
    for (const k of ['codigo', 'estado', 'marca', 'modelo', 'numero_serie', 'categoria', 'observaciones', 'fecha_alta', 'fecha_ultimo_cambio']) {
      expect(equipo, k).toHaveProperty(k);
    }
    expect(equipo).toMatchObject({ codigo: 'EQ-000001', estado: 'Asignado', marca: 'Lenovo', numero_serie: 'PF3ABC01', categoria: 'Notebook' });
  });

  test('CA-06.2 el historial va del más reciente al más antiguo y la fecha del último cambio coincide con la primera fila', async () => {
    const { equipo, historial } = await h.ficha(op, 'EQ-000008');
    expect(historial.map((x) => x.estado_nuevo)).toEqual(['Disponible', 'Asignado', 'Disponible']);
    expect(equipo.fecha_ultimo_cambio).toBe(historial[0].fecha);
  });

  test('CA-06.2 tras un cambio de estado, la fecha del último cambio sigue a la primera fila', async () => {
    await h.cambiarEstado(op, 'EQ-000012', 'Asignado');
    const { equipo, historial } = await h.ficha(op, 'EQ-000012');
    expect(historial[0].estado_nuevo).toBe('Asignado');
    expect(equipo.fecha_ultimo_cambio).toBe(historial[0].fecha);
  });

  test('CA-06.3 la primera entrada de cada historial es el alta', async () => {
    for (let n = 1; n <= 12; n++) {
      const codigo = 'EQ-' + String(n).padStart(6, '0');
      const { historial } = await h.ficha(op, codigo);
      const alta = historial[historial.length - 1];
      expect(alta, codigo).toMatchObject({ estado_anterior: null, estado_nuevo: 'Disponible', motivo: 'Alta del equipo en el inventario' });
      expect(alta.usuario, codigo).toBeTruthy();
      expect(alta.fecha, codigo).toMatch(FECHA);
    }
  });

  test('CA-06.4 un código inexistente responde 404 con el mensaje de no encontrado', async () => {
    const r = await op.get('/api/equipos/EQ-999999');
    expect(r.status()).toBe(404);
    expect((await r.json()).error).toBe('No se encontró ningún equipo con el código «EQ-999999».');
  });

  test('CA-06.5 las fechas usan dd/mm/aaaa hh:mm:ss en hora de Argentina', async () => {
    const { equipo, historial } = await h.ficha(op, 'EQ-000001');
    expect(equipo.fecha_alta).toBe('01/09/2026 09:00:00');
    expect(equipo.fecha_ultimo_cambio).toBe('01/09/2026 10:30:00');
    for (const x of historial) expect(x.fecha).toMatch(FECHA);
  });

  test('CA-06.6 una categoría desactivada se marca en la ficha', async () => {
    const { equipo } = await h.ficha(op, 'EQ-000010');
    expect(equipo.categoria_activa).toBe(false);
  });

  test('HU-06 la ficha ofrece solo acciones válidas para el estado y el rol', async () => {
    expect((await h.ficha(op, 'EQ-000003')).transiciones).toEqual(['Asignado', 'En reparación']);
    expect((await h.ficha(admin, 'EQ-000003')).transiciones).toEqual(['Asignado', 'En reparación', 'Baja']);
    const baja = await h.ficha(admin, 'EQ-000011');
    expect(baja.transiciones).toEqual([]);
    expect(baja.editable).toBe(false);
  });
});
