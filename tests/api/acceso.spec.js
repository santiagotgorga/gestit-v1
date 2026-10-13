// Módulo Acceso y seguridad: HU-01, HU-02 y HU-03 (API)
const { test, expect, request } = require('@playwright/test');
const h = require('../helpers');

test.beforeAll(() => h.resetDB());

test.describe('HU-01 · Iniciar sesión', () => {
  test('CA-01.1 usuario activo con credenciales válidas accede y recibe su nombre y rol', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'admin', password: 'Admin1234' } });
    expect(r.status()).toBe(200);
    const { usuario } = await r.json();
    expect(usuario).toMatchObject({ username: 'admin', nombre: 'Administrador General', rol: 'Administrador' });
    expect(await h.token(ctx)).toBeTruthy();
    expect((await ctx.get('/api/equipos')).status()).toBe(200);
  });

  test('CA-01.1 el usuario se reconoce sin distinguir mayúsculas', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'OPERADOR', password: 'Operador1234' } });
    expect(r.status()).toBe(200);
    expect((await r.json()).usuario.username).toBe('operador');
  });

  test('CA-01.2 contraseña incorrecta: mensaje genérico', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'operador', password: 'Incorrecta1' } });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe(h.MSJ_CREDENCIALES);
    expect(await h.token(ctx)).toBeFalsy();
  });

  test('CA-01.3 usuario inexistente: exactamente el mismo mensaje', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'noexiste', password: 'Cualquiera1' } });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe(h.MSJ_CREDENCIALES);
  });

  test('CA-01.4 usuario desactivado con contraseña correcta: mismo mensaje y no accede', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'inactivo', password: 'Inactivo1234' } });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe(h.MSJ_CREDENCIALES);
    expect(await h.token(ctx)).toBeFalsy();
  });

  test('CA-01.5 campos vacíos: error por campo y no cuenta como intento fallido', async () => {
    const ctx = await h.anonimo();
    for (const data of [{ username: '', password: '' }, { username: 'operador2', password: '' }, { username: '   ', password: 'x' }]) {
      const r = await ctx.post('/api/login', { data });
      expect(r.status()).toBe(400);
      const b = await r.json();
      if (!data.username.trim()) expect(b.campos.username).toBe('El usuario es obligatorio.');
      if (!data.password) expect(b.campos.password).toBe('La contraseña es obligatoria.');
    }
    // 4 fallos reales + varios envíos vacíos: si los vacíos contaran, el usuario quedaría bloqueado
    for (let i = 0; i < 4; i++) await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } });
    for (let i = 0; i < 3; i++) await ctx.post('/api/login', { data: { username: 'operador2', password: '' } });
    const ok = await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } });
    expect(ok.status()).toBe(200);
  });

  test('CA-01.9 un ingreso correcto reinicia el contador de intentos', async () => {
    const ctx = await h.anonimo();
    for (let i = 0; i < 4; i++) await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } });
    expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } })).status()).toBe(200);
    for (let i = 0; i < 4; i++) {
      expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } })).status()).toBe(401);
    }
    expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } })).status()).toBe(200);
  });

  test('CA-01.6 / CA-01.7 el quinto fallo bloquea 15 minutos y luego se rechaza la contraseña correcta', async () => {
    const ctx = await h.anonimo();
    for (let i = 1; i <= 4; i++) {
      expect((await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } })).status()).toBe(401);
    }
    const quinto = await ctx.post('/api/login', { data: { username: 'operador2', password: 'Mala12345' } });
    expect(quinto.status()).toBe(423);
    expect((await quinto.json()).error).toMatch(/bloquead.*15 minutos/i);
    const correcta = await ctx.post('/api/login', { data: { username: 'operador2', password: 'Operador1234' } });
    expect(correcta.status()).toBe(423);
    expect(await h.token(ctx)).toBeFalsy();
    // el bloqueo es por nombre de usuario, sin distinguir mayúsculas
    expect((await ctx.post('/api/login', { data: { username: 'OPERADOR2', password: 'Operador1234' } })).status()).toBe(423);
    h.resetDB(); // desbloquea operador2 para el resto del archivo
  });

  test('CA-01.12 la API sin sesión responde 401 y no entrega datos', async () => {
    const ctx = await h.anonimo();
    for (const url of ['/api/equipos', '/api/equipos/EQ-000001', '/api/categorias', '/api/usuarios', '/api/auditoria', '/api/sesion']) {
      const r = await ctx.get(url);
      expect(r.status(), url).toBe(401);
      const b = await r.json();
      expect(Object.keys(b).sort(), url).toEqual(['codigo', 'error']);
    }
    expect((await ctx.post('/api/equipos', { data: {} })).status()).toBe(401);
  });

  test('CA-01.12 una cookie de sesión inventada no da acceso', async () => {
    const ctx = await request.newContext({ baseURL: h.BASE, extraHTTPHeaders: { Cookie: 'gestit_sid=' + 'a'.repeat(64) } });
    expect((await ctx.get('/api/equipos')).status()).toBe(401);
  });

  test('CA-01.11 una pantalla interna sin sesión redirige al login conservando el destino', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.get('/equipos/EQ-000003', { maxRedirects: 0 });
    expect(r.status()).toBe(302);
    expect(r.headers().location).toBe('/login?motivo=requerida&volver=%2Fequipos%2FEQ-000003');
  });

  test('CA-01.13 los ingresos quedan auditados como LOGIN_OK y LOGIN_FALLIDO', async () => {
    const anon = await h.anonimo();
    await anon.post('/api/login', { data: { username: 'operador', password: 'Equivocada9' } });
    await h.sesion('operador');
    const admin = await h.sesion('admin');
    const fallidos = (await h.auditoria(admin, { accion: 'LOGIN_FALLIDO', usuario: 'operador' })).registros;
    expect(fallidos.length).toBeGreaterThan(0);
    expect(fallidos[0]).toMatchObject({ entidad: 'SESION', identificador: 'operador' });
    const oks = (await h.auditoria(admin, { accion: 'LOGIN_OK', usuario: 'operador' })).registros;
    expect(oks.length).toBeGreaterThan(0);
  });

  test('Robustez: un nombre de usuario muy largo se rechaza con el mensaje genérico, sin error 500', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: { username: 'x'.repeat(150), password: 'Cualquiera1' } });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe(h.MSJ_CREDENCIALES);
  });

  test('Robustez: un cuerpo JSON mal formado responde 400 sin detalles técnicos', async () => {
    const ctx = await h.anonimo();
    const r = await ctx.post('/api/login', { data: '{malformado', headers: { 'Content-Type': 'application/json' } });
    expect(r.status()).toBe(400);
    expect(JSON.stringify(await r.json())).not.toMatch(/SyntaxError|stack|at /);
  });
});

test.describe('HU-02 · Cerrar sesión', () => {
  test('CA-02.1 cerrar sesión responde el mensaje de confirmación', async () => {
    const ctx = await h.sesion('operador');
    const r = await ctx.post('/api/logout');
    expect(r.status()).toBe(200);
    expect((await r.json()).mensaje).toBe('Cerraste sesión correctamente.');
  });

  test('CA-02.3 reutilizar la cookie de una sesión cerrada responde 401', async () => {
    const ctx = await h.sesion('operador');
    const tk = await h.token(ctx);
    await ctx.post('/api/logout');
    const robada = await request.newContext({ baseURL: h.BASE, extraHTTPHeaders: { Cookie: `gestit_sid=${tk}` } });
    expect((await robada.get('/api/equipos')).status()).toBe(401);
    const pag = await robada.get('/equipos', { maxRedirects: 0 });
    expect(pag.status()).toBe(302);
  });

  test('CA-02.4 el cierre de sesión queda auditado como LOGOUT', async () => {
    const ctx = await h.sesion('operador2');
    await ctx.post('/api/logout');
    const admin = await h.sesion('admin');
    const r = (await h.auditoria(admin, { accion: 'LOGOUT', usuario: 'operador2' })).registros;
    expect(r.length).toBe(1);
    expect(r[0]).toMatchObject({ entidad: 'SESION', identificador: 'operador2' });
  });

  test('Las pantallas internas se sirven sin caché (el botón Atrás no las muestra tras cerrar sesión)', async () => {
    const ctx = await h.sesion('operador');
    const r = await ctx.get('/equipos');
    expect(r.headers()['cache-control']).toContain('no-store');
  });
});

test.describe('HU-03 · Restringir funciones según el rol', () => {
  test('CA-03.3 el Operador que abre /usuarios, /categorias o /auditoria recibe 403', async () => {
    const op = await h.sesion('operador');
    for (const url of ['/usuarios', '/categorias', '/auditoria']) {
      const r = await op.get(url);
      expect(r.status(), url).toBe(403);
      expect(await r.text()).toContain('Acceso denegado');
    }
  });

  test('CA-03.4 el Operador no puede crear usuarios por API y los datos no cambian', async () => {
    const op = await h.sesion('operador');
    const r = await op.post('/api/usuarios', { data: { username: 'hacker', nombre: 'H', rol: 'Administrador', password: 'Hacker1234' } });
    expect(r.status()).toBe(403);
    const admin = await h.sesion('admin');
    const lista = await (await admin.get('/api/usuarios')).json();
    expect(lista.find((u) => u.username === 'hacker')).toBeUndefined();
  });

  test('CA-03.4 el Operador no puede eliminar categorías por API', async () => {
    const op = await h.sesion('operador');
    const admin = await h.sesion('admin');
    const nueva = await (await admin.post('/api/categorias', { data: { nombre: 'Temporal Rol' } })).json();
    const r = await op.delete(`/api/categorias/${nueva.id}`);
    expect(r.status()).toBe(403);
    expect((await h.categorias(admin)).some((c) => c.id === nueva.id)).toBe(true);
  });

  test('CA-03.4 el Operador no puede dar de baja por API y el equipo no cambia', async () => {
    const op = await h.sesion('operador');
    const r = await h.cambiarEstado(op, 'EQ-000003', 'Baja');
    expect(r.status()).toBe(403);
    expect((await h.ficha(op, 'EQ-000003')).equipo.estado).toBe('Disponible');
  });

  test('CA-03.4 el Operador no puede consultar usuarios ni auditoría por API', async () => {
    const op = await h.sesion('operador');
    for (const url of ['/api/usuarios', '/api/auditoria', '/api/auditoria/opciones']) {
      expect((await op.get(url)).status(), url).toBe(403);
    }
  });

  test('CA-03.5 cada rechazo queda auditado como ACCESO_DENEGADO con usuario y operación', async () => {
    const op = await h.sesion('operador2');
    await op.get('/usuarios');
    await op.post('/api/categorias', { data: { nombre: 'Intento' } });
    const admin = await h.sesion('admin');
    const r = (await h.auditoria(admin, { accion: 'ACCESO_DENEGADO', usuario: 'operador2' })).registros;
    const ids = r.map((x) => x.identificador);
    expect(ids).toContain('GET /usuarios');
    expect(ids).toContain('POST /api/categorias');
    for (const x of r) expect(x.fecha).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });

  test('CA-03.6 el Administrador accede a todas las secciones', async () => {
    const admin = await h.sesion('admin');
    for (const url of ['/equipos', '/categorias', '/usuarios', '/auditoria']) {
      expect((await admin.get(url)).status(), url).toBe(200);
    }
    for (const url of ['/api/equipos', '/api/categorias', '/api/usuarios', '/api/auditoria']) {
      expect((await admin.get(url)).status(), url).toBe(200);
    }
  });

  test('CA-03.7 un cambio de rol aplica en la siguiente operación sin volver a iniciar sesión', async () => {
    const op = await h.sesion('operador2');
    expect((await op.get('/api/usuarios')).status()).toBe(403);
    const admin = await h.sesion('admin');
    const id = await h.usuarioId(admin, 'operador2');
    expect((await admin.put(`/api/usuarios/${id}`, { data: { nombre: 'Segundo Operador', rol: 'Administrador' } })).status()).toBe(200);
    expect((await op.get('/api/usuarios')).status()).toBe(200);
    expect((await admin.put(`/api/usuarios/${id}`, { data: { nombre: 'Segundo Operador', rol: 'Operador' } })).status()).toBe(200);
    expect((await op.get('/api/usuarios')).status()).toBe(403);
  });
});
