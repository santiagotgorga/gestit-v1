// GestIT V1 - Servidor (Node.js + Express + PostgreSQL)
// Cada regla lleva la referencia a la historia de usuario (HU) y al requerimiento (RF) que implementa.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { pool, tx, inicializar, TZ } = require('./db');

// Parámetros (configurables por variable de entorno para facilitar las pruebas)
const PORT = parseInt(process.env.PORT || '3000', 10);
const SESION_MIN = parseFloat(process.env.SESSION_TIMEOUT_MIN || '30'); // RF-01: 30 min de inactividad
const MAX_INTENTOS = parseInt(process.env.MAX_INTENTOS || '5', 10);      // RF-01: 5 intentos fallidos
const BLOQUEO_MIN = parseFloat(process.env.BLOQUEO_MIN || '15');        // RF-01: 15 min de bloqueo
const TAM_PAGINA = 50;                                                  // RF-06: paginación a partir de 50
const COOKIE = 'gestit_sid';

const ESTADOS = ['Disponible', 'Asignado', 'En reparación', 'Baja'];
// RF-05: máquina de estados
const TRANSICIONES = {
  'Disponible': ['Asignado', 'En reparación', 'Baja'],
  'Asignado': ['Disponible', 'En reparación'],
  'En reparación': ['Disponible', 'Baja'],
  'Baja': [],
};

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// ---------------------------------------------------------------- utilidades
const txt = (v) => (v === undefined || v === null ? '' : String(v)).trim();
const err = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });
const formatoCodigo = (n) => 'EQ-' + String(n).padStart(6, '0');

async function auditar(db, { usuario, username, accion, entidad, identificador, detalle }) {
  await db.query(
    `INSERT INTO auditoria (usuario_id, username, accion, entidad, identificador, detalle)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [usuario ? usuario.id : null, usuario ? usuario.username : (username || null), accion, entidad,
      identificador == null ? null : String(identificador), detalle ? JSON.stringify(detalle) : null]);
}

function validarPassword(p) {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (p.length > 72) return 'La contraseña no puede superar los 72 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(p)) return 'La contraseña debe incluir al menos una letra.';
  if (!/[0-9]/.test(p)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

// ---------------------------------------------------------------- sesión (RF-01)
async function obtenerSesion(req) {
  const token = req.cookies[COOKIE];
  if (!token || typeof token !== 'string') return { estado: 'sin_sesion' };
  const { rows } = await pool.query(
    `SELECT s.token, s.activa, EXTRACT(EPOCH FROM (now() - s.ultima_actividad)) AS inactivo_seg,
            u.id, u.username, u.nombre, u.rol, u.activo
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = $1`, [token]);
  const s = rows[0];
  if (!s || !s.activa || !s.activo) return { estado: 'sin_sesion' };
  if (Number(s.inactivo_seg) > SESION_MIN * 60) {
    await pool.query('UPDATE sesiones SET activa = FALSE WHERE token = $1', [token]);
    return { estado: 'expirada' };
  }
  await pool.query('UPDATE sesiones SET ultima_actividad = now() WHERE token = $1', [token]);
  return { estado: 'ok', usuario: { id: s.id, username: s.username, nombre: s.nombre, rol: s.rol }, token };
}

// API: exige sesión
async function requiereSesion(req, res, next) {
  try {
    const s = await obtenerSesion(req);
    if (s.estado === 'expirada') {
      res.clearCookie(COOKIE);
      return err(res, 401, 'Tu sesión expiró por inactividad. Iniciá sesión nuevamente.', { codigo: 'SESION_EXPIRADA' });
    }
    if (s.estado !== 'ok') return err(res, 401, 'Necesitás iniciar sesión para continuar.', { codigo: 'SESION_REQUERIDA' });
    req.usuario = s.usuario;
    req.token = s.token;
    next();
  } catch (e) { next(e); }
}

// RF-01 / RF-02 / HU-03: validación de rol en el servidor + registro del rechazo en auditoría
function requiereAdmin(entidad) {
  return async (req, res, next) => {
    try {
      if (req.usuario.rol === 'Administrador') return next();
      await auditar(pool, {
        usuario: req.usuario, accion: 'ACCESO_DENEGADO', entidad,
        identificador: `${req.method} ${req.originalUrl}`, detalle: { rol: req.usuario.rol },
      });
      return err(res, 403, 'No tenés permisos para realizar esta operación.', { codigo: 'SIN_PERMISO' });
    } catch (e) { next(e); }
  };
}

// ---------------------------------------------------------------- páginas (RF-01: pantallas internas protegidas)
const PAGINAS = path.join(__dirname, '..', 'public', 'pages');
function pagina(archivo, { admin = false, entidad = 'SISTEMA' } = {}) {
  return async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store'); // el botón "atrás" no muestra pantallas tras cerrar sesión
      const s = await obtenerSesion(req);
      if (s.estado !== 'ok') {
        if (s.estado === 'expirada') res.clearCookie(COOKIE);
        const motivo = s.estado === 'expirada' ? 'expirada' : 'requerida';
        return res.redirect(`/login?motivo=${motivo}&volver=${encodeURIComponent(req.originalUrl)}`);
      }
      if (admin && s.usuario.rol !== 'Administrador') {
        await auditar(pool, {
          usuario: s.usuario, accion: 'ACCESO_DENEGADO', entidad,
          identificador: `GET ${req.originalUrl}`, detalle: { rol: s.usuario.rol },
        });
        return res.status(403).sendFile(path.join(PAGINAS, '403.html'));
      }
      res.sendFile(path.join(PAGINAS, archivo));
    } catch (e) { next(e); }
  };
}

app.get('/', async (req, res, next) => {
  try {
    const s = await obtenerSesion(req);
    res.redirect(s.estado === 'ok' ? '/equipos' : '/login');
  } catch (e) { next(e); }
});
app.get('/login', (req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(PAGINAS, 'login.html')); });
app.get('/equipos', pagina('equipos.html'));
app.get('/equipos/nuevo', pagina('equipo-form.html'));
app.get('/equipos/:codigo/editar', pagina('equipo-form.html'));
app.get('/equipos/:codigo', pagina('ficha.html'));
app.get('/categorias', pagina('categorias.html', { admin: true, entidad: 'CATEGORIA' }));
app.get('/usuarios', pagina('usuarios.html', { admin: true, entidad: 'USUARIO' }));
app.get('/auditoria', pagina('auditoria.html', { admin: true, entidad: 'AUDITORIA' }));

app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js')));

// ================================================================ API
const api = express.Router();

// ---------------------------------------------------------------- HU-01 Iniciar sesión
api.post('/login', async (req, res, next) => {
  try {
    const username = txt(req.body && req.body.username);
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return err(res, 400, 'Ingresá tu usuario y tu contraseña.', {
        campos: { ...(!username && { username: 'El usuario es obligatorio.' }), ...(!password && { password: 'La contraseña es obligatoria.' }) },
      });
    }
    const norm = username.toLowerCase().slice(0, 100);
    const MSJ_GENERICO = 'Usuario o contraseña incorrectos.';
    const MSJ_BLOQUEO = `Por seguridad, el acceso quedó bloqueado durante ${BLOQUEO_MIN} minutos por ${MAX_INTENTOS} intentos fallidos consecutivos. Intentá nuevamente más tarde.`;

    const resultado = await tx(async (db) => {
      await db.query('INSERT INTO intentos_login (username_norm) VALUES ($1) ON CONFLICT DO NOTHING', [norm]);
      const ctl = (await db.query(
        `SELECT fallidos, bloqueado_hasta, (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > now()) AS bloqueado
           FROM intentos_login WHERE username_norm = $1 FOR UPDATE`, [norm])).rows[0];

      const usuario = (await db.query('SELECT * FROM usuarios WHERE lower(username) = $1', [norm])).rows[0];

      if (ctl.bloqueado) {
        await auditar(db, { usuario: null, username, accion: 'LOGIN_FALLIDO', entidad: 'SESION', identificador: username,
          detalle: { motivo: 'Usuario bloqueado temporalmente' } });
        return { status: 423, body: { error: MSJ_BLOQUEO, codigo: 'BLOQUEADO' } };
      }
      // si el bloqueo ya venció, el contador vuelve a cero
      let fallidos = ctl.bloqueado_hasta ? 0 : ctl.fallidos;

      const ok = usuario && usuario.activo && (await bcrypt.compare(password, usuario.password_hash));
      if (!ok) {
        fallidos += 1;
        const bloquear = fallidos >= MAX_INTENTOS;
        await db.query(
          `UPDATE intentos_login SET fallidos = $2,
                  bloqueado_hasta = CASE WHEN $3 THEN now() + ($4 || ' minutes')::interval ELSE NULL END
            WHERE username_norm = $1`, [norm, fallidos, bloquear, String(BLOQUEO_MIN)]);
        const motivo = !usuario ? 'Usuario inexistente' : (!usuario.activo ? 'Usuario desactivado' : 'Contraseña incorrecta');
        await auditar(db, { usuario: null, username, accion: 'LOGIN_FALLIDO', entidad: 'SESION', identificador: username,
          detalle: { motivo, intento: fallidos, bloqueo: bloquear } });
        return bloquear
          ? { status: 423, body: { error: MSJ_BLOQUEO, codigo: 'BLOQUEADO' } }
          : { status: 401, body: { error: MSJ_GENERICO, codigo: 'CREDENCIALES_INVALIDAS' } };
      }

      // ingreso correcto: se reinicia el contador de intentos
      await db.query('UPDATE intentos_login SET fallidos = 0, bloqueado_hasta = NULL WHERE username_norm = $1', [norm]);
      const token = crypto.randomBytes(32).toString('hex');
      await db.query('INSERT INTO sesiones (token, usuario_id) VALUES ($1, $2)', [token, usuario.id]);
      const u = { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol: usuario.rol };
      await auditar(db, { usuario: u, accion: 'LOGIN_OK', entidad: 'SESION', identificador: usuario.username });
      return { status: 200, token, body: { usuario: u } };
    });

    if (resultado.token) {
      res.cookie(COOKIE, resultado.token, { httpOnly: true, sameSite: 'lax', path: '/' });
    }
    res.status(resultado.status).json(resultado.body);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- HU-02 Cerrar sesión
api.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies[COOKIE];
    if (token) {
      const s = await obtenerSesion(req);
      await pool.query('UPDATE sesiones SET activa = FALSE WHERE token = $1', [token]);
      if (s.estado === 'ok') {
        await auditar(pool, { usuario: s.usuario, accion: 'LOGOUT', entidad: 'SESION', identificador: s.usuario.username });
      }
    }
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ mensaje: 'Cerraste sesión correctamente.' });
  } catch (e) { next(e); }
});

// a partir de acá, toda la API exige sesión (RF-01)
api.use(requiereSesion);

api.get('/sesion', (req, res) => {
  res.json({ usuario: req.usuario, timeoutMinutos: SESION_MIN });
});

// ---------------------------------------------------------------- HU-10 Categorías
api.get('/categorias', async (req, res, next) => {
  try {
    const todas = req.query.todas === '1';
    const { rows } = await pool.query(
      `SELECT c.id, c.nombre, c.activa,
              (SELECT count(*)::int FROM equipos e WHERE e.categoria_id = c.id) AS equipos
         FROM categorias c ${todas ? '' : 'WHERE c.activa'} ORDER BY lower(c.nombre)`);
    res.json(rows);
  } catch (e) { next(e); }
});

function validarNombreCategoria(nombre) {
  if (!nombre) return 'El nombre de la categoría es obligatorio.';
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (nombre.length > 50) return 'El nombre no puede superar los 50 caracteres.';
  return null;
}

api.post('/categorias', requiereAdmin('CATEGORIA'), async (req, res, next) => {
  try {
    const nombre = txt(req.body && req.body.nombre);
    const e = validarNombreCategoria(nombre);
    if (e) return err(res, 400, e, { campos: { nombre: e } });
    const r = await tx(async (db) => {
      const dup = await db.query('SELECT nombre FROM categorias WHERE lower(nombre) = lower($1)', [nombre]);
      if (dup.rows.length) return { status: 409, body: { error: `Ya existe una categoría con el nombre «${dup.rows[0].nombre}».`, campos: { nombre: 'Nombre repetido.' } } };
      const c = (await db.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre, activa', [nombre])).rows[0];
      await auditar(db, { usuario: req.usuario, accion: 'ALTA', entidad: 'CATEGORIA', identificador: c.nombre, detalle: { nombre: c.nombre } });
      return { status: 201, body: { ...c, mensaje: `Categoría «${c.nombre}» creada.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { if (e.code === '23505') return err(res, 409, 'Ya existe una categoría con ese nombre.'); next(e); }
});

api.put('/categorias/:id', requiereAdmin('CATEGORIA'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const nombre = txt(req.body && req.body.nombre);
    const e = validarNombreCategoria(nombre);
    if (e) return err(res, 400, e, { campos: { nombre: e } });
    const r = await tx(async (db) => {
      const c = (await db.query('SELECT * FROM categorias WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!c) return { status: 404, body: { error: 'La categoría no existe.' } };
      if (c.nombre === nombre) return { status: 200, body: { mensaje: 'No se detectaron cambios.', sinCambios: true } };
      const dup = await db.query('SELECT nombre FROM categorias WHERE lower(nombre) = lower($1) AND id <> $2', [nombre, id]);
      if (dup.rows.length) return { status: 409, body: { error: `Ya existe una categoría con el nombre «${dup.rows[0].nombre}».`, campos: { nombre: 'Nombre repetido.' } } };
      await db.query('UPDATE categorias SET nombre = $1 WHERE id = $2', [nombre, id]);
      await auditar(db, { usuario: req.usuario, accion: 'MODIFICACION', entidad: 'CATEGORIA', identificador: nombre,
        detalle: { nombre: { anterior: c.nombre, nuevo: nombre } } });
      return { status: 200, body: { mensaje: `Categoría renombrada a «${nombre}».` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { if (e.code === '23505') return err(res, 409, 'Ya existe una categoría con ese nombre.'); next(e); }
});

for (const [ruta, activa, accion] of [['desactivar', false, 'DESACTIVACION'], ['activar', true, 'ACTIVACION']]) {
  api.post(`/categorias/:id/${ruta}`, requiereAdmin('CATEGORIA'), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const r = await tx(async (db) => {
        const c = (await db.query('SELECT * FROM categorias WHERE id = $1 FOR UPDATE', [id])).rows[0];
        if (!c) return { status: 404, body: { error: 'La categoría no existe.' } };
        if (c.activa === activa) return { status: 200, body: { mensaje: `La categoría ya estaba ${activa ? 'activa' : 'desactivada'}.` } };
        await db.query('UPDATE categorias SET activa = $1 WHERE id = $2', [activa, id]);
        await auditar(db, { usuario: req.usuario, accion, entidad: 'CATEGORIA', identificador: c.nombre,
          detalle: { activa: { anterior: c.activa, nuevo: activa } } });
        return { status: 200, body: { mensaje: `Categoría «${c.nombre}» ${activa ? 'activada' : 'desactivada'}.` } };
      });
      res.status(r.status).json(r.body);
    } catch (e) { next(e); }
  });
}

api.delete('/categorias/:id', requiereAdmin('CATEGORIA'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await tx(async (db) => {
      const c = (await db.query('SELECT * FROM categorias WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!c) return { status: 404, body: { error: 'La categoría no existe.' } };
      const n = (await db.query('SELECT count(*)::int AS n FROM equipos WHERE categoria_id = $1', [id])).rows[0].n;
      if (n > 0) {
        return { status: 422, body: { error: `No se puede eliminar la categoría «${c.nombre}» porque tiene ${n} equipo(s) asociado(s). Podés desactivarla para que deje de ofrecerse en el alta.` } };
      }
      await db.query('DELETE FROM categorias WHERE id = $1', [id]);
      await auditar(db, { usuario: req.usuario, accion: 'ELIMINACION', entidad: 'CATEGORIA', identificador: c.nombre, detalle: { nombre: c.nombre } });
      return { status: 200, body: { mensaje: `Categoría «${c.nombre}» eliminada.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- HU-07 Buscar y filtrar equipos
api.get('/equipos', async (req, res, next) => {
  try {
    const cond = [];
    const params = [];
    const q = txt(req.query.q);
    if (q) {
      params.push('%' + q.replace(/[\\%_]/g, (m) => '\\' + m) + '%');
      const p = `$${params.length}`;
      cond.push(`(e.codigo ILIKE ${p} OR e.marca ILIKE ${p} OR e.modelo ILIKE ${p} OR e.numero_serie ILIKE ${p})`);
    }
    const cat = txt(req.query.categoria);
    if (cat) {
      if (!/^\d+$/.test(cat)) return err(res, 400, 'La categoría indicada no es válida.');
      params.push(parseInt(cat, 10));
      cond.push(`e.categoria_id = $${params.length}`);
    }
    const estado = txt(req.query.estado);
    if (estado) {
      if (!ESTADOS.includes(estado)) return err(res, 400, 'El estado indicado no es válido.');
      params.push(estado);
      cond.push(`e.estado = $${params.length}`);
    } else if (req.query.incluirBajas !== '1') {
      cond.push(`e.estado <> 'Baja'`); // RF-06: bajas excluidas por defecto
    }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const total = (await pool.query(`SELECT count(*)::int AS n FROM equipos e ${where}`, params)).rows[0].n;
    const paginas = Math.max(1, Math.ceil(total / TAM_PAGINA));
    let pagina = parseInt(req.query.pagina || '1', 10);
    if (!Number.isFinite(pagina) || pagina < 1) pagina = 1;
    if (pagina > paginas) pagina = paginas;
    const { rows } = await pool.query(
      `SELECT e.codigo, e.marca, e.modelo, e.numero_serie, e.estado, c.nombre AS categoria
         FROM equipos e JOIN categorias c ON c.id = e.categoria_id
         ${where} ORDER BY e.codigo ASC LIMIT ${TAM_PAGINA} OFFSET ${(pagina - 1) * TAM_PAGINA}`, params);
    res.json({ total, pagina, paginas, tamPagina: TAM_PAGINA, equipos: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- HU-06 Ficha del equipo
api.get('/equipos/:codigo', async (req, res, next) => {
  try {
    const codigo = txt(req.params.codigo).toUpperCase();
    const e = (await pool.query(
      `SELECT e.id, e.codigo, e.marca, e.modelo, e.numero_serie, e.observaciones, e.estado, e.version,
              e.categoria_id, c.nombre AS categoria, c.activa AS categoria_activa,
              to_char(e.creado_en AT TIME ZONE $2, 'DD/MM/YYYY HH24:MI:SS') AS fecha_alta,
              to_char(e.ultimo_cambio_estado AT TIME ZONE $2, 'DD/MM/YYYY HH24:MI:SS') AS fecha_ultimo_cambio
         FROM equipos e JOIN categorias c ON c.id = e.categoria_id WHERE e.codigo = $1`, [codigo, TZ])).rows[0];
    if (!e) return err(res, 404, `No se encontró ningún equipo con el código «${codigo}».`, { codigo: 'NO_ENCONTRADO' });
    const historial = (await pool.query(
      `SELECT to_char(h.fecha AT TIME ZONE $2, 'DD/MM/YYYY HH24:MI:SS') AS fecha, h.estado_anterior, h.estado_nuevo,
              h.motivo, u.username AS usuario
         FROM historial_estados h JOIN usuarios u ON u.id = h.usuario_id
        WHERE h.equipo_id = $1 ORDER BY h.fecha DESC, h.id DESC`, [e.id, TZ])).rows;
    let transiciones = TRANSICIONES[e.estado];
    if (req.usuario.rol !== 'Administrador') transiciones = transiciones.filter((t) => t !== 'Baja');
    delete e.id;
    res.json({ equipo: e, historial, transiciones, editable: e.estado !== 'Baja' });
  } catch (e) { next(e); }
});

function validarEquipo(b) {
  const d = {
    marca: txt(b.marca), modelo: txt(b.modelo), numero_serie: txt(b.numero_serie),
    categoria_id: txt(b.categoria_id), observaciones: txt(b.observaciones),
  };
  const campos = {};
  if (!d.marca) campos.marca = 'La marca es obligatoria.';
  else if (d.marca.length > 50) campos.marca = 'La marca no puede superar los 50 caracteres.';
  if (!d.modelo) campos.modelo = 'El modelo es obligatorio.';
  else if (d.modelo.length > 80) campos.modelo = 'El modelo no puede superar los 80 caracteres.';
  if (!d.numero_serie) campos.numero_serie = 'El número de serie es obligatorio.';
  else if (d.numero_serie.length > 50) campos.numero_serie = 'El número de serie no puede superar los 50 caracteres.';
  if (!d.categoria_id) campos.categoria_id = 'La categoría es obligatoria.';
  else if (!/^\d+$/.test(d.categoria_id)) campos.categoria_id = 'La categoría seleccionada no es válida.';
  if (d.observaciones.length > 500) campos.observaciones = 'Las observaciones no pueden superar los 500 caracteres.';
  d.categoria_id = parseInt(d.categoria_id, 10);
  d.observaciones = d.observaciones || null;
  return { d, campos };
}

// ---------------------------------------------------------------- HU-04 + HU-13 Registrar equipo
api.post('/equipos', async (req, res, next) => {
  try {
    const { d, campos } = validarEquipo(req.body || {});
    if (Object.keys(campos).length) return err(res, 400, 'Revisá los datos ingresados.', { campos });
    const r = await tx(async (db) => {
      const cat = (await db.query('SELECT * FROM categorias WHERE id = $1', [d.categoria_id])).rows[0];
      if (!cat || !cat.activa) {
        return { status: 400, body: { error: 'Revisá los datos ingresados.', campos: { categoria_id: 'La categoría seleccionada no existe o está desactivada.' } } };
      }
      const dup = (await db.query('SELECT codigo FROM equipos WHERE lower(btrim(numero_serie)) = lower($1)', [d.numero_serie])).rows[0];
      if (dup) {
        return { status: 409, body: { error: `Ya existe un equipo con el número de serie «${d.numero_serie}» (${dup.codigo}).`, campos: { numero_serie: 'Número de serie repetido.' } } };
      }
      // HU-13: el código se calcula dentro de la transacción (correlativo, sin huecos, no reutilizable)
      const n = (await db.query("UPDATE contadores SET valor = valor + 1 WHERE nombre = 'equipo' RETURNING valor")).rows[0].valor;
      const codigo = formatoCodigo(n);
      const id = (await db.query(
        `INSERT INTO equipos (codigo, marca, modelo, numero_serie, categoria_id, observaciones, estado)
         VALUES ($1,$2,$3,$4,$5,$6,'Disponible') RETURNING id`,
        [codigo, d.marca, d.modelo, d.numero_serie, d.categoria_id, d.observaciones])).rows[0].id;
      await db.query(
        `INSERT INTO historial_estados (equipo_id, estado_anterior, estado_nuevo, motivo, usuario_id)
         VALUES ($1, NULL, 'Disponible', 'Alta del equipo en el inventario', $2)`, [id, req.usuario.id]);
      await auditar(db, { usuario: req.usuario, accion: 'ALTA', entidad: 'EQUIPO', identificador: codigo,
        detalle: { marca: d.marca, modelo: d.modelo, numero_serie: d.numero_serie, categoria: cat.nombre, observaciones: d.observaciones, estado: 'Disponible' } });
      return { status: 201, body: { codigo, estado: 'Disponible', mensaje: `Equipo registrado con el código ${codigo}.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) {
    if (e.code === '23505') return err(res, 409, 'Ya existe un equipo con ese número de serie.', { campos: { numero_serie: 'Número de serie repetido.' } });
    next(e);
  }
});

// ---------------------------------------------------------------- HU-05 Editar equipo
api.put('/equipos/:codigo', async (req, res, next) => {
  try {
    const codigo = txt(req.params.codigo).toUpperCase();
    const { d, campos } = validarEquipo(req.body || {});
    const r = await tx(async (db) => {
      const e = (await db.query(
        `SELECT e.*, c.nombre AS categoria FROM equipos e JOIN categorias c ON c.id = e.categoria_id
          WHERE e.codigo = $1 FOR UPDATE OF e`, [codigo])).rows[0];
      if (!e) return { status: 404, body: { error: `No se encontró ningún equipo con el código «${codigo}».` } };
      if (e.estado === 'Baja') return { status: 422, body: { error: 'Un equipo dado de baja no admite edición.', codigo: 'EQUIPO_DADO_DE_BAJA' } };
      if (Object.keys(campos).length) return { status: 400, body: { error: 'Revisá los datos ingresados.', campos } };

      let catNueva = { id: e.categoria_id, nombre: e.categoria };
      if (d.categoria_id !== e.categoria_id) {
        const c = (await db.query('SELECT * FROM categorias WHERE id = $1', [d.categoria_id])).rows[0];
        if (!c || !c.activa) return { status: 400, body: { error: 'Revisá los datos ingresados.', campos: { categoria_id: 'La categoría seleccionada no existe o está desactivada.' } } };
        catNueva = c;
      }
      const cambios = {};
      for (const f of ['marca', 'modelo', 'numero_serie', 'observaciones']) {
        if ((e[f] || null) !== (d[f] || null)) cambios[f] = { anterior: e[f], nuevo: d[f] };
      }
      if (catNueva.id !== e.categoria_id) cambios.categoria = { anterior: e.categoria, nuevo: catNueva.nombre };
      if (!Object.keys(cambios).length) return { status: 200, body: { mensaje: 'No se detectaron cambios para guardar.', sinCambios: true } };

      if (cambios.numero_serie) {
        const dup = (await db.query(
          'SELECT codigo FROM equipos WHERE lower(btrim(numero_serie)) = lower($1) AND id <> $2', [d.numero_serie, e.id])).rows[0];
        if (dup) return { status: 409, body: { error: `Ya existe un equipo con el número de serie «${d.numero_serie}» (${dup.codigo}).`, campos: { numero_serie: 'Número de serie repetido.' } } };
      }
      await db.query(
        `UPDATE equipos SET marca=$1, modelo=$2, numero_serie=$3, categoria_id=$4, observaciones=$5 WHERE id=$6`,
        [d.marca, d.modelo, d.numero_serie, catNueva.id, d.observaciones, e.id]);
      await auditar(db, { usuario: req.usuario, accion: 'MODIFICACION', entidad: 'EQUIPO', identificador: codigo, detalle: cambios });
      return { status: 200, body: { mensaje: 'Cambios guardados correctamente.', cambios } };
    });
    res.status(r.status).json(r.body);
  } catch (e) {
    if (e.code === '23505') return err(res, 409, 'Ya existe un equipo con ese número de serie.', { campos: { numero_serie: 'Número de serie repetido.' } });
    next(e);
  }
});

// ---------------------------------------------------------------- HU-08 / HU-09 Cambio de estado y baja
api.post('/equipos/:codigo/estado', async (req, res, next) => {
  try {
    const codigo = txt(req.params.codigo).toUpperCase();
    const b = req.body || {};
    const nuevo = txt(b.estado);
    const motivo = txt(b.motivo);
    const version = b.version === undefined || b.version === null || b.version === '' ? null : Number(b.version);

    if (!ESTADOS.includes(nuevo)) return err(res, 400, 'El estado indicado no es válido.', { campos: { estado: 'Seleccioná un estado válido.' } });
    // HU-09 / RF-05: la baja está restringida al Administrador
    if (nuevo === 'Baja' && req.usuario.rol !== 'Administrador') {
      await auditar(pool, { usuario: req.usuario, accion: 'ACCESO_DENEGADO', entidad: 'EQUIPO', identificador: codigo,
        detalle: { operacion: 'Baja de equipo', rol: req.usuario.rol } });
      return err(res, 403, 'No tenés permisos para dar de baja equipos. Esta acción está reservada al Administrador.', { codigo: 'SIN_PERMISO' });
    }
    if (version === null || !Number.isInteger(version)) return err(res, 400, 'Falta la versión del equipo. Recargá la ficha y volvé a intentarlo.', { campos: { version: 'Requerido.' } });

    const r = await tx(async (db) => {
      const e = (await db.query('SELECT * FROM equipos WHERE codigo = $1 FOR UPDATE', [codigo])).rows[0];
      if (!e) return { status: 404, body: { error: `No se encontró ningún equipo con el código «${codigo}».` } };
      // RF-05: concurrencia — se aplica el primero, el segundo recibe aviso de conflicto
      if (e.version !== version) {
        return { status: 409, body: { error: `Otro usuario modificó el estado de este equipo mientras lo editabas (ahora está «${e.estado}»). Recargá la ficha y volvé a intentarlo.`, codigo: 'CONFLICTO', estadoActual: e.estado } };
      }
      if (e.estado === 'Baja') return { status: 422, body: { error: 'Un equipo dado de baja no admite cambios de estado.', codigo: 'TRANSICION_INVALIDA' } };
      if (e.estado === nuevo) return { status: 422, body: { error: `El equipo ya se encuentra en estado «${nuevo}».`, codigo: 'TRANSICION_INVALIDA' } };
      if (e.estado === 'Asignado' && nuevo === 'Baja') {
        return { status: 422, body: { error: 'No se puede dar de baja un equipo Asignado: primero registrá su devolución (cambiá el estado a «Disponible»).', codigo: 'TRANSICION_INVALIDA' } };
      }
      if (!TRANSICIONES[e.estado].includes(nuevo)) {
        return { status: 422, body: { error: `La transición de «${e.estado}» a «${nuevo}» no está permitida.`, codigo: 'TRANSICION_INVALIDA' } };
      }
      if (motivo.length < 10 || motivo.length > 500) {
        return { status: 400, body: { error: 'Revisá los datos ingresados.', campos: { motivo: 'El motivo debe tener entre 10 y 500 caracteres.' } } };
      }
      await db.query(
        'UPDATE equipos SET estado = $1, version = version + 1, ultimo_cambio_estado = now() WHERE id = $2', [nuevo, e.id]);
      await db.query(
        `INSERT INTO historial_estados (equipo_id, estado_anterior, estado_nuevo, motivo, usuario_id)
         VALUES ($1,$2,$3,$4,$5)`, [e.id, e.estado, nuevo, motivo, req.usuario.id]);
      await auditar(db, { usuario: req.usuario, accion: nuevo === 'Baja' ? 'BAJA' : 'CAMBIO_ESTADO', entidad: 'EQUIPO', identificador: codigo,
        detalle: { estado: { anterior: e.estado, nuevo }, motivo } });
      return { status: 200, body: { mensaje: nuevo === 'Baja' ? `El equipo ${codigo} fue dado de baja.` : `Estado actualizado: «${e.estado}» → «${nuevo}».`, estado: nuevo, version: e.version + 1 } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------- HU-11 Usuarios
const usuariosAdmin = express.Router();
usuariosAdmin.use(requiereAdmin('USUARIO'));

usuariosAdmin.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, nombre, rol, activo, to_char(creado_en AT TIME ZONE $1, 'DD/MM/YYYY') AS creado
         FROM usuarios ORDER BY lower(username)`, [TZ]);
    res.json(rows);
  } catch (e) { next(e); }
});

usuariosAdmin.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    const username = txt(b.username);
    const nombre = txt(b.nombre);
    const rol = txt(b.rol);
    const password = typeof b.password === 'string' ? b.password : '';
    const campos = {};
    if (!username) campos.username = 'El nombre de usuario es obligatorio.';
    else if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) campos.username = 'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.';
    if (!nombre) campos.nombre = 'El nombre y apellido es obligatorio.';
    else if (nombre.length > 100) campos.nombre = 'El nombre no puede superar los 100 caracteres.';
    if (!['Administrador', 'Operador'].includes(rol)) campos.rol = 'Seleccioná un rol válido.';
    const pe = validarPassword(password);
    if (pe) campos.password = pe;
    if (Object.keys(campos).length) return err(res, 400, 'Revisá los datos ingresados.', { campos });
    const r = await tx(async (db) => {
      const dup = (await db.query('SELECT 1 FROM usuarios WHERE lower(username) = lower($1)', [username])).rows[0];
      if (dup) return { status: 409, body: { error: `El nombre de usuario «${username}» ya está en uso.`, campos: { username: 'Usuario repetido.' } } };
      const u = (await db.query(
        'INSERT INTO usuarios (username, nombre, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id, username, nombre, rol, activo',
        [username, nombre, await bcrypt.hash(password, 10), rol])).rows[0];
      await auditar(db, { usuario: req.usuario, accion: 'ALTA', entidad: 'USUARIO', identificador: username, detalle: { username, nombre, rol } });
      return { status: 201, body: { ...u, mensaje: `Usuario «${username}» creado.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { if (e.code === '23505') return err(res, 409, 'El nombre de usuario ya está en uso.'); next(e); }
});

async function adminsActivos(db) {
  return (await db.query("SELECT count(*)::int AS n FROM usuarios WHERE rol = 'Administrador' AND activo")).rows[0].n;
}

usuariosAdmin.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const nombre = txt(b.nombre);
    const rol = txt(b.rol);
    const campos = {};
    if (!nombre) campos.nombre = 'El nombre y apellido es obligatorio.';
    else if (nombre.length > 100) campos.nombre = 'El nombre no puede superar los 100 caracteres.';
    if (!['Administrador', 'Operador'].includes(rol)) campos.rol = 'Seleccioná un rol válido.';
    if (Object.keys(campos).length) return err(res, 400, 'Revisá los datos ingresados.', { campos });
    const r = await tx(async (db) => {
      await db.query('LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE');
      const u = (await db.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0];
      if (!u) return { status: 404, body: { error: 'El usuario no existe.' } };
      const cambios = {};
      if (u.nombre !== nombre) cambios.nombre = { anterior: u.nombre, nuevo: nombre };
      if (u.rol !== rol) {
        if (u.id === req.usuario.id) return { status: 422, body: { error: 'No podés cambiar tu propio rol.' } };
        if (u.rol === 'Administrador' && u.activo && (await adminsActivos(db)) <= 1) {
          return { status: 422, body: { error: 'No se puede quitar el rol al último Administrador activo del sistema.' } };
        }
        cambios.rol = { anterior: u.rol, nuevo: rol };
      }
      if (!Object.keys(cambios).length) return { status: 200, body: { mensaje: 'No se detectaron cambios para guardar.', sinCambios: true } };
      await db.query('UPDATE usuarios SET nombre = $1, rol = $2 WHERE id = $3', [nombre, rol, id]);
      await auditar(db, { usuario: req.usuario, accion: 'MODIFICACION', entidad: 'USUARIO', identificador: u.username, detalle: cambios });
      return { status: 200, body: { mensaje: `Usuario «${u.username}» actualizado.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { next(e); }
});

usuariosAdmin.post('/:id/password', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
    const pe = validarPassword(password);
    if (pe) return err(res, 400, pe, { campos: { password: pe } });
    const r = await tx(async (db) => {
      const u = (await db.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0];
      if (!u) return { status: 404, body: { error: 'El usuario no existe.' } };
      await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(password, 10), id]);
      await auditar(db, { usuario: req.usuario, accion: 'MODIFICACION', entidad: 'USUARIO', identificador: u.username,
        detalle: { password: { anterior: '(oculta)', nuevo: '(oculta)' } } });
      return { status: 200, body: { mensaje: `Contraseña de «${u.username}» actualizada.` } };
    });
    res.status(r.status).json(r.body);
  } catch (e) { next(e); }
});

for (const [ruta, activo, accion] of [['desactivar', false, 'DESACTIVACION'], ['activar', true, 'ACTIVACION']]) {
  usuariosAdmin.post(`/:id/${ruta}`, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const r = await tx(async (db) => {
        await db.query('LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE');
        const u = (await db.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0];
        if (!u) return { status: 404, body: { error: 'El usuario no existe.' } };
        if (u.activo === activo) return { status: 200, body: { mensaje: `El usuario ya estaba ${activo ? 'activo' : 'desactivado'}.` } };
        if (!activo) {
          if (u.rol === 'Administrador' && (await adminsActivos(db)) <= 1) {
            return { status: 422, body: { error: 'No se puede desactivar al último Administrador activo del sistema.' } };
          }
          if (u.id === req.usuario.id) return { status: 422, body: { error: 'No podés desactivar tu propio usuario.' } };
          await db.query('UPDATE sesiones SET activa = FALSE WHERE usuario_id = $1', [id]); // pierde el acceso de inmediato
        }
        await db.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, id]);
        await auditar(db, { usuario: req.usuario, accion, entidad: 'USUARIO', identificador: u.username,
          detalle: { activo: { anterior: u.activo, nuevo: activo } } });
        return { status: 200, body: { mensaje: `Usuario «${u.username}» ${activo ? 'activado' : 'desactivado'}.` } };
      });
      res.status(r.status).json(r.body);
    } catch (e) { next(e); }
  });
}
api.use('/usuarios', usuariosAdmin);

// ---------------------------------------------------------------- HU-12 Auditoría
const auditoriaAdmin = express.Router();
auditoriaAdmin.use(requiereAdmin('AUDITORIA'));

auditoriaAdmin.get('/opciones', async (req, res, next) => {
  try {
    const usuarios = (await pool.query('SELECT DISTINCT username FROM auditoria WHERE username IS NOT NULL ORDER BY username')).rows.map((r) => r.username);
    const acciones = (await pool.query('SELECT DISTINCT accion FROM auditoria ORDER BY accion')).rows.map((r) => r.accion);
    const entidades = (await pool.query('SELECT DISTINCT entidad FROM auditoria ORDER BY entidad')).rows.map((r) => r.entidad);
    res.json({ usuarios, acciones, entidades });
  } catch (e) { next(e); }
});

auditoriaAdmin.get('/', async (req, res, next) => {
  try {
    const cond = [];
    const params = [];
    const add = (sql, v) => { params.push(v); cond.push(sql.replace('?', `$${params.length}`)); };
    const usuario = txt(req.query.usuario);
    const accion = txt(req.query.accion);
    const entidad = txt(req.query.entidad);
    const desde = txt(req.query.desde);
    const hasta = txt(req.query.hasta);
    const fechaOk = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(f));
    if (desde && !fechaOk(desde)) return err(res, 400, 'La fecha «desde» no es válida.', { campos: { desde: 'Fecha inválida.' } });
    if (hasta && !fechaOk(hasta)) return err(res, 400, 'La fecha «hasta» no es válida.', { campos: { hasta: 'Fecha inválida.' } });
    if (desde && hasta && desde > hasta) return err(res, 400, 'La fecha «desde» no puede ser posterior a la fecha «hasta».', { campos: { desde: 'Rango inválido.' } });
    if (usuario) add('lower(username) = lower(?)', usuario);
    if (accion) add('accion = ?', accion);
    if (entidad) add('entidad = ?', entidad);
    if (desde) add(`fecha >= (?::date)::timestamp AT TIME ZONE '${TZ}'`, desde);
    if (hasta) add(`fecha < ((?::date + 1))::timestamp AT TIME ZONE '${TZ}'`, hasta);
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const total = (await pool.query(`SELECT count(*)::int AS n FROM auditoria ${where}`, params)).rows[0].n;
    const paginas = Math.max(1, Math.ceil(total / TAM_PAGINA));
    let pagina = parseInt(req.query.pagina || '1', 10);
    if (!Number.isFinite(pagina) || pagina < 1) pagina = 1;
    if (pagina > paginas) pagina = paginas;
    const { rows } = await pool.query(
      `SELECT id, to_char(fecha AT TIME ZONE '${TZ}', 'DD/MM/YYYY HH24:MI:SS') AS fecha, username AS usuario,
              accion, entidad, identificador, detalle
         FROM auditoria ${where} ORDER BY auditoria.fecha DESC, id DESC
        LIMIT ${TAM_PAGINA} OFFSET ${(pagina - 1) * TAM_PAGINA}`, params);
    res.json({ total, pagina, paginas, tamPagina: TAM_PAGINA, registros: rows });
  } catch (e) { next(e); }
});

// RF-07: no existe ninguna operación para editar o eliminar registros de auditoría
auditoriaAdmin.all(['/', '/:id'], (req, res) => {
  res.set('Allow', 'GET');
  err(res, 405, 'Los registros de auditoría no pueden modificarse ni eliminarse.', { codigo: 'OPERACION_NO_PERMITIDA' });
});
api.use('/auditoria', auditoriaAdmin);

api.use((req, res) => err(res, 404, 'Recurso inexistente.'));
app.use('/api', api);

// páginas inexistentes
app.use((req, res) => res.status(404).sendFile(path.join(PAGINAS, '404.html')));

// errores no controlados: nunca se exponen detalles técnicos (RNF-02)
// eslint-disable-next-line no-unused-vars
app.use((e, req, res, next) => {
  if (e.type === 'entity.parse.failed') return err(res, 400, 'El cuerpo de la solicitud no es un JSON válido.');
  console.error(e);
  err(res, 500, 'Ocurrió un error inesperado. Intentá nuevamente.');
});

if (require.main === module) {
  (async () => {
    for (let i = 1; i <= 30; i++) {
      try { await inicializar(); break; } catch (e) {
        if (i === 30) { console.error('No se pudo conectar a la base de datos:', e.message); process.exit(1); }
        console.log(`Esperando a la base de datos (intento ${i})...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    app.listen(PORT, () => console.log(`GestIT V1 escuchando en http://localhost:${PORT}`));
  })();
}

module.exports = app;
