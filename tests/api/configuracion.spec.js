// Módulo Configuración y control: HU-10, HU-11 y HU-12 (API)
const { test, expect, request } = require('@playwright/test');
const h = require('../helpers');

let admin;
let op;

test.beforeAll(async () => {
  h.resetDB();
  [admin, op] = await Promise.all([h.sesion('admin'), h.sesion('operador')]);
});

const crearCat = (nombre) => admin.post('/api/categorias', { data: { nombre } });

test.describe('HU-10 · Administrar categorías de equipos', () => {
  test('CA-10.1 crear «Servidor»: activa, 0 equipos y disponible para el alta', async () => {
    const r = await crearCat('Servidor');
    expect(r.status()).toBe(201);
    const c = (await h.categorias(admin)).find((x) => x.nombre === 'Servidor');
    expect(c).toMatchObject({ activa: true, equipos: 0 });
    expect((await h.categorias(op, false)).map((x) => x.nombre)).toContain('Servidor');
  });

  test('CA-10.2 crear «notebook» se rechaza por nombre repetido', async () => {
    const r = await crearCat('notebook');
    expect(r.status()).toBe(409);
    expect((await r.json()).error).toBe('Ya existe una categoría con el nombre «Notebook».');
  });

  test('CA-10.2 renombrar otra categoría a «NOTEBOOK» se rechaza', async () => {
    const r = await admin.put(`/api/categorias/${await h.categoriaId(admin, 'Tablet')}`, { data: { nombre: 'NOTEBOOK' } });
    expect(r.status()).toBe(409);
  });

  for (const [desc, nombre, campo] of [['vacío', '', 'El nombre de la categoría es obligatorio.'], ['solo espacios', '   ', 'El nombre de la categoría es obligatorio.'],
    ['1 carácter', 'A', 'El nombre debe tener al menos 2 caracteres.'], ['51 caracteres', 'C'.repeat(51), 'El nombre no puede superar los 50 caracteres.']]) {
    test(`CA-10.3 nombre ${desc}: se rechaza indicando el campo`, async () => {
      const r = await crearCat(nombre);
      expect(r.status()).toBe(400);
      expect((await r.json()).campos.nombre).toBe(campo);
    });
  }

  test('CA-10.3 nombres de 2 y de 50 caracteres se aceptan (valores límite)', async () => {
    expect((await crearCat('UP')).status()).toBe(201);
    expect((await crearCat('D'.repeat(50))).status()).toBe(201);
  });

  test('CA-10.4 renombrar una categoría con equipos se refleja en ficha y listado', async () => {
    const id = await h.categoriaId(admin, 'Monitor');
    expect((await admin.put(`/api/categorias/${id}`, { data: { nombre: 'Pantalla' } })).status()).toBe(200);
    expect((await h.ficha(op, 'EQ-000005')).equipo.categoria).toBe('Pantalla');
    const lista = await (await op.get(`/api/equipos?categoria=${id}`)).json();
    expect(lista.equipos.every((e) => e.categoria === 'Pantalla')).toBe(true);
    expect(lista.total).toBe(2);
  });

  test('CA-10.5 desactivar: deja de ofrecerse en el alta y los equipos la muestran como desactivada; se puede reactivar', async () => {
    const id = await h.categoriaId(admin, 'Celular');
    expect((await admin.post(`/api/categorias/${id}/desactivar`)).status()).toBe(200);
    expect((await h.categorias(op, false)).map((x) => x.nombre)).not.toContain('Celular');
    const f = await h.ficha(op, 'EQ-000008');
    expect(f.equipo).toMatchObject({ categoria: 'Celular', categoria_activa: false });
    expect((await admin.post(`/api/categorias/${id}/activar`)).status()).toBe(200);
    expect((await h.categorias(op, false)).map((x) => x.nombre)).toContain('Celular');
  });

  test('CA-10.6 eliminar una categoría con equipos se rechaza con el mensaje esperado', async () => {
    const r = await admin.delete(`/api/categorias/${await h.categoriaId(admin, 'Notebook')}`);
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toMatch(/^No se puede eliminar la categoría «Notebook» porque tiene 4 equipo\(s\) asociado\(s\)\. Podés desactivarla/);
  });

  test('CA-10.6 una categoría cuyos únicos equipos están dados de baja tampoco se elimina', async () => {
    const c = await (await crearCat('Solo Bajas')).json();
    const codigo = await h.altaOk(op, { categoria_id: c.id });
    await h.cambiarEstado(admin, codigo, 'Baja');
    expect((await admin.delete(`/api/categorias/${c.id}`)).status()).toBe(422);
  });

  test('CA-10.7 una categoría sin equipos se elimina y desaparece de la lista', async () => {
    const c = await (await crearCat('Efímera')).json();
    const r = await admin.delete(`/api/categorias/${c.id}`);
    expect(r.status()).toBe(200);
    expect((await h.categorias(admin)).some((x) => x.id === c.id)).toBe(false);
  });

  test('CA-10.8 el Operador recibe 403 en todas las operaciones de categorías', async () => {
    const id = await h.categoriaId(admin, 'Tablet');
    const intentos = [
      op.post('/api/categorias', { data: { nombre: 'X Operador' } }),
      op.put(`/api/categorias/${id}`, { data: { nombre: 'X Operador' } }),
      op.post(`/api/categorias/${id}/desactivar`),
      op.post(`/api/categorias/${id}/activar`),
      op.delete(`/api/categorias/${id}`),
    ];
    for (const r of await Promise.all(intentos)) expect(r.status()).toBe(403);
    expect((await h.categorias(admin)).find((x) => x.id === id)).toMatchObject({ nombre: 'Tablet', activa: true });
  });

  test('CA-10.9 las operaciones de categorías quedan auditadas con entidad CATEGORIA', async () => {
    const c = await (await crearCat('Auditada')).json();
    await admin.put(`/api/categorias/${c.id}`, { data: { nombre: 'Auditada 2' } });
    await admin.post(`/api/categorias/${c.id}/desactivar`);
    await admin.post(`/api/categorias/${c.id}/activar`);
    await admin.delete(`/api/categorias/${c.id}`);
    const regs = (await h.auditoria(admin, { entidad: 'CATEGORIA', usuario: 'admin' })).registros
      .filter((x) => ['Auditada', 'Auditada 2'].includes(x.identificador));
    expect(regs.map((x) => x.accion).reverse()).toEqual(['ALTA', 'MODIFICACION', 'DESACTIVACION', 'ACTIVACION', 'ELIMINACION']);
  });

  test('Robustez: un id de categoría no numérico responde 404, sin error 500', async () => {
    expect((await admin.delete('/api/categorias/abc')).status()).toBe(404);
    expect((await admin.put('/api/categorias/abc', { data: { nombre: 'Algo' } })).status()).toBe(404);
  });
});

test.describe('HU-11 · Administrar usuarios del sistema', () => {
  const crear = (data) => admin.post('/api/usuarios', { data: { nombre: 'Persona de Prueba', rol: 'Operador', ...data } });

  test('CA-11.1 crear un Operador con «abcdefg1»: aparece activo y puede ingresar', async () => {
    const r = await crear({ username: 'tecnico1', password: 'abcdefg1' });
    expect(r.status()).toBe(201);
    const u = (await (await admin.get('/api/usuarios')).json()).find((x) => x.username === 'tecnico1');
    expect(u).toMatchObject({ rol: 'Operador', activo: true });
    await h.sesion('tecnico1', 'abcdefg1');
  });

  test('CA-11.2 «TECNICO1» se rechaza por usuario repetido', async () => {
    const r = await crear({ username: 'TECNICO1', password: 'abcdefg1' });
    expect(r.status()).toBe(409);
    expect((await r.json()).campos.username).toBeTruthy();
  });

  for (const [pass, msj] of [['abc1234', 'al menos 8 caracteres'], ['abcdefgh', 'al menos un número'], ['12345678', 'al menos una letra'], ['', 'al menos 8 caracteres']]) {
    test(`CA-11.3 contraseña «${pass}» se rechaza indicando la regla`, async () => {
      const r = await crear({ username: 'nuevo_pwd', password: pass });
      expect(r.status()).toBe(400);
      expect((await r.json()).campos.password).toContain(msj);
    });
  }

  for (const [desc, data, campo] of [['con espacios', { username: 'juan perez' }, 'username'], ['de 2 caracteres', { username: 'ab' }, 'username'],
    ['de 31 caracteres', { username: 'u'.repeat(31) }, 'username'], ['sin rol', { username: 'sinrol', rol: '' }, 'rol'],
    ['con rol inventado', { username: 'superu', rol: 'Root' }, 'rol'], ['sin nombre', { username: 'sinnombre', nombre: '  ' }, 'nombre']]) {
    test(`CA-11.4 usuario ${desc}: se rechaza indicando el campo`, async () => {
      const r = await crear({ password: 'Valida123', ...data });
      expect(r.status()).toBe(400);
      expect(Object.keys((await r.json()).campos)).toContain(campo);
    });
  }

  test('CA-11.4 usuarios de 3 y 30 caracteres con punto, guion y guion bajo se aceptan', async () => {
    expect((await crear({ username: 'a.b', password: 'Valida123' })).status()).toBe(201);
    expect((await crear({ username: 'x_y-z.' + 'w'.repeat(24), password: 'Valida123' })).status()).toBe(201);
  });

  test('CA-11.5 ni la lista ni las respuestas exponen la contraseña ni su hash', async () => {
    const r = await crear({ username: 'secreto', password: 'MiClave123' });
    const txt = JSON.stringify(await r.json()) + JSON.stringify(await (await admin.get('/api/usuarios')).json());
    expect(txt).not.toMatch(/password|MiClave123|\$2[aby]\$/i);
  });

  test('CA-11.6 / CA-03.7 un Operador promovido a Administrador accede de inmediato', async () => {
    await crear({ username: 'promovido', password: 'Promo1234' });
    const ctx = await h.sesion('promovido', 'Promo1234');
    expect((await ctx.get('/api/auditoria')).status()).toBe(403);
    const id = await h.usuarioId(admin, 'promovido');
    await admin.put(`/api/usuarios/${id}`, { data: { nombre: 'Persona de Prueba', rol: 'Administrador' } });
    expect((await ctx.get('/api/auditoria')).status()).toBe(200);
  });

  test('CA-11.7 desactivar a un usuario con sesión abierta lo saca de inmediato y no puede volver a ingresar', async () => {
    await crear({ username: 'saliente', password: 'Salir1234' });
    const ctx = await h.sesion('saliente', 'Salir1234');
    expect((await ctx.get('/api/equipos')).status()).toBe(200);
    const id = await h.usuarioId(admin, 'saliente');
    expect((await admin.post(`/api/usuarios/${id}/desactivar`)).status()).toBe(200);
    expect((await ctx.get('/api/equipos')).status()).toBe(401);
    const anon = await h.anonimo();
    const r = await anon.post('/api/login', { data: { username: 'saliente', password: 'Salir1234' } });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe(h.MSJ_CREDENCIALES);
    const reg = (await h.auditoria(admin, { accion: 'DESACTIVACION', entidad: 'USUARIO' })).registros[0];
    expect(reg).toMatchObject({ usuario: 'admin', identificador: 'saliente' });
  });

  test('CA-11.8 los registros de un usuario desactivado siguen en la auditoría', async () => {
    const regs = await h.auditoria(admin, { usuario: 'saliente' });
    expect(regs.total).toBeGreaterThan(0);
    expect(regs.registros.map((x) => x.accion)).toContain('LOGIN_OK');
  });

  test('CA-11.9 el único Administrador activo no puede desactivarse', async () => {
    h.resetDB();
    admin = await h.sesion('admin');
    const r = await admin.post(`/api/usuarios/${await h.usuarioId(admin, 'admin')}/desactivar`);
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toBe('No se puede desactivar al último Administrador activo del sistema.');
  });

  test('CA-11.9 con otro Administrador activo, el mensaje es «No podés desactivar tu propio usuario.»', async () => {
    await crear({ username: 'admin2', password: 'Admin21234', rol: 'Administrador' });
    const r = await admin.post(`/api/usuarios/${await h.usuarioId(admin, 'admin')}/desactivar`);
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toBe('No podés desactivar tu propio usuario.');
  });

  test('CA-11.10 el Administrador no puede cambiar su propio rol', async () => {
    const r = await admin.put(`/api/usuarios/${await h.usuarioId(admin, 'admin')}`, { data: { nombre: 'Administrador General', rol: 'Operador' } });
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toBe('No podés cambiar tu propio rol.');
  });

  test('CA-11.11 con una nueva contraseña el usuario ingresa con la nueva y no con la anterior', async () => {
    const id = await h.usuarioId(admin, 'operador');
    expect((await admin.post(`/api/usuarios/${id}/password`, { data: { password: 'NuevaClave9' } })).status()).toBe(200);
    const anon = await h.anonimo();
    expect((await anon.post('/api/login', { data: { username: 'operador', password: 'Operador1234' } })).status()).toBe(401);
    expect((await anon.post('/api/login', { data: { username: 'operador', password: 'NuevaClave9' } })).status()).toBe(200);
  });

  test('CA-11.11 una nueva contraseña inválida se rechaza', async () => {
    const id = await h.usuarioId(admin, 'operador');
    expect((await admin.post(`/api/usuarios/${id}/password`, { data: { password: 'corta1' } })).status()).toBe(400);
  });

  test('CA-11.12 las operaciones sobre usuarios se auditan y la contraseña figura como «(oculta)»', async () => {
    const regs = (await h.auditoria(admin, { entidad: 'USUARIO' })).registros;
    const pwd = regs.find((x) => x.identificador === 'operador' && x.detalle && x.detalle.password);
    expect(pwd.detalle.password).toEqual({ anterior: '(oculta)', nuevo: '(oculta)' });
    expect(regs.map((x) => x.accion)).toEqual(expect.arrayContaining(['ALTA', 'MODIFICACION']));
    const todo = JSON.stringify((await h.auditoria(admin, {})).registros);
    for (const clave of ['NuevaClave9', 'Admin21234', 'Operador1234']) expect(todo).not.toContain(clave);
  });

  test('Seguridad: una contraseña de más de 72 bytes no admite ingresar con solo su comienzo', async () => {
    const clave = 'ñ'.repeat(40) + '1'; // 41 caracteres, 81 bytes en UTF-8
    expect((await crear({ username: 'multibyte', password: clave })).status()).toBe(201);
    const anon = await h.anonimo();
    expect((await anon.post('/api/login', { data: { username: 'multibyte', password: clave } })).status()).toBe(200);
    const r = await anon.post('/api/login', { data: { username: 'multibyte', password: 'ñ'.repeat(36) } });
    expect(r.status(), 'ingresar con una contraseña distinta (solo los primeros 72 bytes)').toBe(401);
  });

  test('Robustez: un id de usuario no numérico responde 404, sin error 500', async () => {
    expect((await admin.put('/api/usuarios/abc', { data: { nombre: 'X', rol: 'Operador' } })).status()).toBe(404);
    expect((await admin.post('/api/usuarios/abc/desactivar')).status()).toBe(404);
  });
});

test.describe('HU-12 · Consultar el registro de auditoría', () => {
  test('CA-12.1 los registros van del más reciente al más antiguo con fecha dd/mm/aaaa hh:mm:ss', async () => {
    const { registros } = await h.auditoria(admin, {});
    const aIso = (f) => f.replace(/^(\d{2})\/(\d{2})\/(\d{4}) (.*)$/, '$3-$2-$1T$4');
    for (let i = 1; i < registros.length; i++) expect(aIso(registros[i - 1].fecha) >= aIso(registros[i].fecha)).toBe(true);
    for (const r of registros) {
      expect(r.fecha).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
      for (const k of ['usuario', 'accion', 'entidad', 'identificador', 'detalle']) expect(r).toHaveProperty(k);
    }
  });

  test('CA-12.3 un login fallido con «noexiste» aparece con el nombre ingresado', async () => {
    const anon = await h.anonimo();
    await anon.post('/api/login', { data: { username: 'noexiste', password: 'Algo12345' } });
    const regs = (await h.auditoria(admin, { accion: 'LOGIN_FALLIDO' })).registros;
    expect(regs.find((x) => x.identificador === 'noexiste')).toMatchObject({ usuario: 'noexiste', entidad: 'SESION' });
  });

  test('CA-12.4 un rechazo por permisos aparece con el usuario y la operación', async () => {
    const opx = await h.sesion('operador2');
    await opx.delete('/api/categorias/1');
    const reg = (await h.auditoria(admin, { accion: 'ACCESO_DENEGADO' })).registros[0];
    expect(reg).toMatchObject({ usuario: 'operador2', identificador: 'DELETE /api/categorias/1' });
  });

  test('CA-12.5 filtrar Desde 01/09/2026 Hasta 01/09/2026 trae solo ese día (extremos inclusivos)', async () => {
    const { registros, total } = await h.auditoria(admin, { desde: '2026-09-01', hasta: '2026-09-01' });
    expect(total).toBe(2); // alta de EQ-000001 a las 09:00 y asignación a las 10:30
    for (const r of registros) expect(r.fecha.startsWith('01/09/2026')).toBe(true);
    const rango = await h.auditoria(admin, { desde: '2026-09-01', hasta: '2026-09-02' });
    expect(rango.total).toBe(4);
  });

  test('CA-12.6 «Desde» posterior a «Hasta» informa rango inválido', async () => {
    const r = await admin.get('/api/auditoria?desde=2026-09-10&hasta=2026-09-01');
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toMatch(/no puede ser posterior/);
  });

  test('CA-12.6 una fecha mal formada se rechaza sin error técnico', async () => {
    for (const q of ['desde=2026-13-45', 'hasta=ayer', 'desde=2026-02-30']) {
      const r = await admin.get('/api/auditoria?' + q);
      expect(r.status(), q).toBe(400);
    }
  });

  test('CA-12.7 usuario admin + acción BAJA + entidad EQUIPO se combinan', async () => {
    const { registros, total } = await h.auditoria(admin, { usuario: 'admin', accion: 'BAJA', entidad: 'EQUIPO' });
    expect(total).toBeGreaterThan(0);
    for (const r of registros) expect(r).toMatchObject({ usuario: 'admin', accion: 'BAJA', entidad: 'EQUIPO' });
  });

  test('CA-12.8 filtros sin coincidencias devuelven 0 registros', async () => {
    expect((await h.auditoria(admin, { usuario: 'operador', accion: 'BAJA' })).total).toBe(0);
  });

  test('CA-12.10 PUT, PATCH y DELETE sobre la auditoría responden 405 y el registro no cambia', async () => {
    const antes = await h.auditoria(admin, {});
    const id = antes.registros[antes.registros.length - 1].id;
    for (const m of ['put', 'patch', 'delete']) {
      for (const url of ['/api/auditoria', `/api/auditoria/${id}`]) {
        const r = await admin[m](url, { data: { accion: 'X' } });
        expect(r.status(), `${m} ${url}`).toBe(405);
      }
    }
    const despues = await h.auditoria(admin, {});
    expect(despues.registros.find((x) => x.id === id)).toEqual(antes.registros.find((x) => x.id === id));
  });

  test('CA-12.11 el Operador no accede a la auditoría por API ni por URL', async () => {
    const opx = await h.sesion('operador2');
    expect((await opx.get('/api/auditoria')).status()).toBe(403);
    expect((await opx.get('/auditoria')).status()).toBe(403);
  });

  test('CA-12.12 con más de 50 registros se pagina de a 50', async () => {
    const anon = await h.anonimo();
    const { total } = await h.auditoria(admin, {});
    for (let i = total; i <= 55; i++) await anon.post('/api/login', { data: { username: `relleno${i}`, password: 'x' } });
    const p1 = await h.auditoria(admin, {});
    expect(p1.total).toBeGreaterThan(50);
    expect(p1.registros).toHaveLength(50);
    expect(p1.paginas).toBe(Math.ceil(p1.total / 50));
    const p2 = await h.auditoria(admin, { pagina: 2 });
    expect(p2.registros.length).toBe(p1.total - 50);
  });
});
