// Utilidades compartidas por las pruebas de API y de interfaz.
const path = require('path');
const { execSync } = require('child_process');
const { request, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
// Comando que restablece los datos semilla (RNF-09). Por defecto, el de Docker Compose.
const RESET_CMD = process.env.RESET_CMD || 'docker compose exec -T app npm run reset';

const USUARIOS = {
  admin: ['admin', 'Admin1234'],
  operador: ['operador', 'Operador1234'],
  operador2: ['operador2', 'Operador1234'],
  inactivo: ['inactivo', 'Inactivo1234'],
};
const MOTIVO = 'Motivo de prueba automatizada';
const MSJ_CREDENCIALES = 'Usuario o contraseña incorrectos.';

function resetDB() {
  execSync(RESET_CMD, { cwd: path.join(__dirname, '..'), stdio: 'pipe', shell: true });
}

async function anonimo() {
  return request.newContext({ baseURL: BASE });
}

// Devuelve un contexto de API con la sesión iniciada
async function sesion(usuario, password) {
  if (!password) [usuario, password] = USUARIOS[usuario];
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.post('/api/login', { data: { username: usuario, password } });
  expect(r.status(), `login de ${usuario}`).toBe(200);
  return ctx;
}

async function token(ctx) {
  const c = (await ctx.storageState()).cookies.find((x) => x.name === 'gestit_sid');
  return c && c.value;
}

async function ficha(ctx, codigo) {
  const r = await ctx.get(`/api/equipos/${codigo}`);
  expect(r.status(), `ficha ${codigo}`).toBe(200);
  return r.json();
}

async function cambiarEstado(ctx, codigo, estado, motivo = MOTIVO, version) {
  if (version === undefined) version = (await ficha(ctx, codigo)).equipo.version;
  return ctx.post(`/api/equipos/${codigo}/estado`, { data: { estado, motivo, version } });
}

async function categorias(ctx, todas = true) {
  return (await ctx.get(`/api/categorias${todas ? '?todas=1' : ''}`)).json();
}

async function categoriaId(ctx, nombre) {
  const c = (await categorias(ctx)).find((x) => x.nombre === nombre);
  expect(c, `categoría ${nombre}`).toBeTruthy();
  return c.id;
}

let serieSec = 0;
function serieUnica(prefijo = 'TST') {
  serieSec += 1;
  return `${prefijo}-${Date.now().toString(36)}-${serieSec}`.toUpperCase();
}

async function altaEquipo(ctx, datos = {}) {
  const base = { marca: 'Marca Test', modelo: 'Modelo Test', numero_serie: serieUnica(), categoria_id: await categoriaId(ctx, 'Notebook') };
  return ctx.post('/api/equipos', { data: { ...base, ...datos } });
}

async function altaOk(ctx, datos) {
  const r = await altaEquipo(ctx, datos);
  expect(r.status(), JSON.stringify(await r.json())).toBe(201);
  return (await r.json()).codigo;
}

async function auditoria(ctx, filtros = {}) {
  const r = await ctx.get('/api/auditoria?' + new URLSearchParams(filtros));
  expect(r.status()).toBe(200);
  return r.json();
}

async function usuarioId(ctxAdmin, username) {
  const u = (await (await ctxAdmin.get('/api/usuarios')).json()).find((x) => x.username === username);
  expect(u, `usuario ${username}`).toBeTruthy();
  return u.id;
}

// ---- interfaz
async function loginUI(page, usuario, password) {
  if (!password) [usuario, password] = USUARIOS[usuario];
  await page.goto('/login');
  await page.getByTestId('login-usuario').fill(usuario);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-ingresar').click();
  await expect(page.getByTestId('usuario-actual')).toBeVisible();
}

module.exports = {
  BASE, USUARIOS, MOTIVO, MSJ_CREDENCIALES, resetDB, anonimo, sesion, token, ficha, cambiarEstado,
  categorias, categoriaId, serieUnica, altaEquipo, altaOk, auditoria, usuarioId, loginUI,
};
