// Módulo Gestión de equipos: HU-07, HU-08 y HU-09 (API)
const { test, expect } = require('@playwright/test');
const h = require('../helpers');

let op;
let op2;
let admin;

test.beforeAll(async () => {
  h.resetDB();
  [op, op2, admin] = await Promise.all([h.sesion('operador'), h.sesion('operador2'), h.sesion('admin')]);
});

async function buscar(params) {
  const r = await op.get('/api/equipos?' + new URLSearchParams(params));
  expect(r.status()).toBe(200);
  return r.json();
}
const codigos = (b) => b.equipos.map((e) => e.codigo);

test.describe('HU-07 · Buscar y filtrar equipos', () => {
  test('CA-07.1 «thinkpad» encuentra ThinkPad T14 y ThinkPad T460', async () => {
    const b = await buscar({ q: 'thinkpad' });
    expect(b.equipos.map((e) => e.modelo).sort()).toEqual(['ThinkPad T14 Gen 3', 'ThinkPad T460']);
  });

  test('CA-07.2 «000007» encuentra EQ-000007', async () => {
    expect(codigos(await buscar({ q: '000007' }))).toEqual(['EQ-000007']);
  });

  test('CA-07.3 «pf3abc» encuentra la serie PF3ABC01', async () => {
    expect(codigos(await buscar({ q: 'pf3abc' }))).toEqual(['EQ-000001']);
  });

  test('HU-07 la búsqueda ignora espacios al inicio y al final', async () => {
    expect(codigos(await buscar({ q: '   pf3abc   ' }))).toEqual(['EQ-000001']);
  });

  test('CA-07.4 texto + categoría + estado se combinan', async () => {
    const cat = await h.categoriaId(op, 'Notebook');
    const b = await buscar({ q: 'lenovo', categoria: cat, estado: 'Asignado' });
    expect(codigos(b)).toEqual(['EQ-000001']);
    for (const e of b.equipos) expect(e).toMatchObject({ categoria: 'Notebook', estado: 'Asignado' });
  });

  test('CA-07.5 el listado inicial no incluye equipos dados de baja', async () => {
    const b = await buscar({});
    expect(b.total).toBe(11);
    expect(b.equipos.some((e) => e.estado === 'Baja')).toBe(false);
  });

  test('CA-07.6 con «Incluir dados de baja» o con el estado «Baja» aparecen las bajas', async () => {
    expect(codigos(await buscar({ incluirBajas: '1' }))).toContain('EQ-000011');
    expect(codigos(await buscar({ estado: 'Baja' }))).toEqual(['EQ-000011']);
  });

  test('CA-07.7 una búsqueda sin coincidencias devuelve cero resultados', async () => {
    const b = await buscar({ q: 'zzzz' });
    expect(b.total).toBe(0);
    expect(b.equipos).toEqual([]);
  });

  test('CA-07.12 «%» y «_» se interpretan literalmente', async () => {
    const cat = await h.categoriaId(op, 'Periférico');
    const conPorc = await h.altaOk(op, { marca: 'Generic', modelo: 'Hub 100% USB', categoria_id: cat });
    const conGuion = await h.altaOk(op, { marca: 'Generic', modelo: 'Cable_USB', categoria_id: cat });
    expect(codigos(await buscar({ q: '%' }))).toEqual([conPorc]);
    expect(codigos(await buscar({ q: '_' }))).toEqual([conGuion]);
    expect(codigos(await buscar({ q: '\\' }))).toEqual([]);
  });

  test('HU-07 un estado o categoría inválidos en la URL se rechazan sin error técnico', async () => {
    expect((await op.get('/api/equipos?estado=Robado')).status()).toBe(400);
    expect((await op.get('/api/equipos?categoria=abc')).status()).toBe(400);
  });

  test('Robustez: un id de categoría fuera de rango en el filtro no produce error 500', async () => {
    const r = await op.get('/api/equipos?categoria=99999999999');
    expect([200, 400]).toContain(r.status());
  });

  test('CA-07.10 / CA-07.11 con 50 resultados no se pagina; con 51 se pagina de a 50', async () => {
    const actuales = (await buscar({})).total; // la búsqueda %/_ ya agregó 2
    for (let i = actuales; i < 50; i++) await h.altaOk(op, { marca: 'Paginado' });
    const b50 = await buscar({});
    expect(b50.total).toBe(50);
    expect(b50.paginas).toBe(1);
    expect(b50.equipos).toHaveLength(50);
    await h.altaOk(op, { marca: 'Paginado' });
    const p1 = await buscar({});
    expect(p1).toMatchObject({ total: 51, paginas: 2, pagina: 1 });
    expect(p1.equipos).toHaveLength(50);
    const p2 = await buscar({ pagina: 2 });
    expect(p2.equipos).toHaveLength(1);
    expect(new Set([...codigos(p1), ...codigos(p2)]).size).toBe(51);
  });
});

test.describe('HU-08 · Cambiar el estado de un equipo', () => {
  test('CA-08.1 / CA-08.2 / CA-08.3 las transiciones ofrecidas al Operador según el estado', async () => {
    expect((await h.ficha(op, 'EQ-000003')).transiciones).toEqual(['Asignado', 'En reparación']);
    expect((await h.ficha(op, 'EQ-000004')).transiciones).toEqual(['Disponible', 'En reparación']);
    expect((await h.ficha(op, 'EQ-000002')).transiciones).toEqual(['Disponible']);
  });

  test('CA-08.4 Disponible → Asignado con motivo válido suma una fila al tope del historial', async () => {
    const motivo = 'Entrega a Juan Pérez de Contaduría';
    const r = await h.cambiarEstado(op, 'EQ-000005', 'Asignado', motivo);
    expect(r.status()).toBe(200);
    expect((await r.json()).mensaje).toBe('Estado actualizado: «Disponible» → «Asignado».');
    const { equipo, historial } = await h.ficha(op, 'EQ-000005');
    expect(equipo.estado).toBe('Asignado');
    expect(historial).toHaveLength(2);
    expect(historial[0]).toMatchObject({ estado_anterior: 'Disponible', estado_nuevo: 'Asignado', usuario: 'operador', motivo });
  });

  for (const [desc, motivo] of [['9 caracteres', '123456789'], ['solo espacios', '               '],
    ['9 caracteres con espacios alrededor', '    123456789    '], ['501 caracteres', 'x'.repeat(501)], ['vacío', '']]) {
    test(`CA-08.5 motivo de ${desc}: se rechaza y el estado no cambia`, async () => {
      const r = await h.cambiarEstado(op, 'EQ-000007', 'Asignado', motivo);
      expect(r.status()).toBe(400);
      expect((await r.json()).campos.motivo).toBe('El motivo debe tener entre 10 y 500 caracteres.');
      expect((await h.ficha(op, 'EQ-000007')).equipo.estado).toBe('Disponible');
    });
  }

  test('CA-08.6 motivo de exactamente 10 y exactamente 500 caracteres se acepta', async () => {
    expect((await h.cambiarEstado(op, 'EQ-000007', 'Asignado', '1234567890')).status()).toBe(200);
    expect((await h.cambiarEstado(op, 'EQ-000007', 'Disponible', 'y'.repeat(500))).status()).toBe(200);
    const { historial } = await h.ficha(op, 'EQ-000007');
    expect(historial[0].motivo).toHaveLength(500);
  });

  test('CA-08.7 transiciones no permitidas: Asignado → Asignado y En reparación → Asignado (422)', async () => {
    const a = await h.cambiarEstado(op, 'EQ-000004', 'Asignado');
    expect(a.status()).toBe(422);
    const b = await h.cambiarEstado(op, 'EQ-000002', 'Asignado');
    expect(b.status()).toBe(422);
    expect((await b.json()).error).toBe('La transición de «En reparación» a «Asignado» no está permitida.');
    expect((await h.ficha(op, 'EQ-000004')).equipo.estado).toBe('Asignado');
    expect((await h.ficha(op, 'EQ-000002')).equipo.estado).toBe('En reparación');
  });

  for (const estado of ['Disponible', 'Asignado', 'En reparación']) {
    test(`CA-08.8 un equipo en Baja no admite pasar a ${estado}`, async () => {
      const r = await h.cambiarEstado(admin, 'EQ-000011', estado);
      expect(r.status()).toBe(422);
      expect((await r.json()).error).toBe('Un equipo dado de baja no admite cambios de estado.');
    });
  }

  test('CA-08.8 forzado por API sin enviar la versión también se rechaza con el mensaje de baja', async () => {
    const r = await admin.post('/api/equipos/EQ-000011/estado', { data: { estado: 'Disponible', motivo: h.MOTIVO } });
    expect((await r.json()).error).toBe('Un equipo dado de baja no admite cambios de estado.');
  });

  test('CA-08.9 dos usuarios con la misma ficha: se aplica el primero y el segundo recibe conflicto', async () => {
    const v = (await h.ficha(op, 'EQ-000009')).equipo.version;
    const r1 = await h.cambiarEstado(op, 'EQ-000009', 'Asignado', 'Primer usuario asigna', v);
    const r2 = await h.cambiarEstado(op2, 'EQ-000009', 'En reparación', 'Segundo usuario repara', v);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(409);
    expect((await r2.json()).error).toMatch(/^Otro usuario modificó el estado de este equipo/);
    const { historial } = await h.ficha(op, 'EQ-000009');
    expect(historial).toHaveLength(2);
  });

  test('CA-08.9 confirmaciones realmente simultáneas: solo una se aplica', async () => {
    const v = (await h.ficha(op, 'EQ-000012')).equipo.version;
    const rs = await Promise.all([
      h.cambiarEstado(op, 'EQ-000012', 'Asignado', 'Carrera de usuario uno', v),
      h.cambiarEstado(op2, 'EQ-000012', 'En reparación', 'Carrera de usuario dos', v),
    ]);
    expect(rs.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect((await h.ficha(op, 'EQ-000012')).historial).toHaveLength(2);
  });

  test('CA-08.10 el cambio queda en auditoría CAMBIO_ESTADO con anterior, nuevo y motivo', async () => {
    const motivo = 'Pantalla con píxeles muertos';
    await h.cambiarEstado(op, 'EQ-000003', 'En reparación', motivo);
    const reg = (await h.auditoria(admin, { accion: 'CAMBIO_ESTADO' })).registros.find((x) => x.identificador === 'EQ-000003');
    expect(reg).toMatchObject({ usuario: 'operador', entidad: 'EQUIPO' });
    expect(reg.detalle).toEqual({ estado: { anterior: 'Disponible', nuevo: 'En reparación' }, motivo });
  });

  test('HU-08 un estado inexistente se rechaza con 400', async () => {
    expect((await h.cambiarEstado(op, 'EQ-000006', 'Robado')).status()).toBe(400);
  });
});

test.describe('HU-09 · Dar de baja un equipo', () => {
  test('CA-09.1 el Administrador da de baja un equipo Disponible', async () => {
    const codigo = await h.altaOk(op);
    const r = await h.cambiarEstado(admin, codigo, 'Baja', 'Equipo obsoleto, se descarta');
    expect(r.status()).toBe(200);
    expect((await r.json()).mensaje).toBe(`El equipo ${codigo} fue dado de baja.`);
    expect((await h.ficha(admin, codigo)).equipo.estado).toBe('Baja');
  });

  test('CA-09.1 el Administrador da de baja un equipo En reparación', async () => {
    expect((await h.cambiarEstado(admin, 'EQ-000002', 'Baja', 'Reparación más cara que el equipo')).status()).toBe(200);
  });

  test('CA-09.4 dar de baja un equipo Asignado por API se rechaza con 422', async () => {
    const r = await h.cambiarEstado(admin, 'EQ-000006', 'Baja');
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toMatch(/primero registrá su devolución/);
    expect((await h.ficha(admin, 'EQ-000006')).equipo.estado).toBe('Asignado');
  });

  test('CA-09.4 el motivo también es obligatorio en la baja', async () => {
    const codigo = await h.altaOk(op);
    const r = await h.cambiarEstado(admin, codigo, 'Baja', 'corto');
    expect(r.status()).toBe(400);
    expect((await h.ficha(admin, codigo)).equipo.estado).toBe('Disponible');
  });

  test('CA-09.5 el Operador recibe 403, el equipo no cambia y queda auditado', async () => {
    const codigo = await h.altaOk(op);
    const r = await h.cambiarEstado(op, codigo, 'Baja');
    expect(r.status()).toBe(403);
    expect((await h.ficha(op, codigo)).equipo.estado).toBe('Disponible');
    const reg = (await h.auditoria(admin, { accion: 'ACCESO_DENEGADO', entidad: 'EQUIPO' })).registros.find((x) => x.identificador === codigo);
    expect(reg.usuario).toBe('operador');
  });

  test('CA-09.6 un equipo dado de baja conserva su historial y no ofrece acciones', async () => {
    const f = await h.ficha(admin, 'EQ-000011');
    expect(f.historial.map((x) => x.estado_nuevo)).toEqual(['Baja', 'En reparación', 'Disponible']);
    expect(f.transiciones).toEqual([]);
    expect(f.editable).toBe(false);
  });

  test('CA-09.7 la baja no aparece en el listado por defecto, sí con «Incluir dados de baja»', async () => {
    expect(codigos(await buscar({ q: 'EQ-000011' }))).toEqual([]);
    expect(codigos(await buscar({ q: 'EQ-000011', incluirBajas: '1' }))).toEqual(['EQ-000011']);
  });

  test('CA-09.9 la baja queda auditada como BAJA con usuario y motivo', async () => {
    const codigo = await h.altaOk(op);
    await h.cambiarEstado(admin, codigo, 'Baja', 'Robado, denuncia policial 123');
    const reg = (await h.auditoria(admin, { accion: 'BAJA' })).registros.find((x) => x.identificador === codigo);
    expect(reg).toMatchObject({ usuario: 'admin', entidad: 'EQUIPO' });
    expect(reg.detalle.motivo).toBe('Robado, denuncia policial 123');
  });
});
