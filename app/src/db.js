// Acceso a PostgreSQL + inicialización del esquema y datos semilla
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://gestit:gestit@localhost:5432/gestit',
});

const TZ = 'America/Argentina/Buenos_Aires';

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function crearEsquema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

// Datos iniciales conocidos (RNF-09: estado inicial reproducible para cada ciclo de pruebas)
async function sembrar(client) {
  const hash = (p) => bcrypt.hashSync(p, 10);
  const u = async (username, nombre, pass, rol, activo = true) =>
    (await client.query(
      'INSERT INTO usuarios (username, nombre, password_hash, rol, activo) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [username, nombre, hash(pass), rol, activo])).rows[0].id;

  const admin = await u('admin', 'Administrador General', 'Admin1234', 'Administrador');
  const oper = await u('operador', 'Operador de Soporte', 'Operador1234', 'Operador');
  await u('operador2', 'Segundo Operador', 'Operador1234', 'Operador');
  await u('inactivo', 'Usuario Desactivado', 'Inactivo1234', 'Operador', false);

  const cats = {};
  for (const [nombre, activa] of [['Notebook', true], ['Desktop', true], ['Monitor', true],
    ['Impresora', true], ['Celular', true], ['Periférico', true], ['Proyector', false], ['Tablet', true]]) {
    cats[nombre] = (await client.query(
      'INSERT INTO categorias (nombre, activa) VALUES ($1,$2) RETURNING id', [nombre, activa])).rows[0].id;
  }

  // [marca, modelo, serie, categoria, observaciones, recorrido de estados]
  const equipos = [
    ['Lenovo', 'ThinkPad T14 Gen 3', 'PF3ABC01', 'Notebook', 'Equipo de recepción', ['Asignado']],
    ['Lenovo', 'ThinkPad T460', 'PF0XYZ02', 'Notebook', null, ['En reparación']],
    ['Dell', 'Latitude 5420', 'DL5420-0003', 'Notebook', null, []],
    ['HP', 'ProDesk 400 G7', 'HPPD-7781', 'Desktop', null, ['Asignado']],
    ['Samsung', 'Odyssey 24"', 'SMG-24-0005', 'Monitor', null, []],
    ['LG', '27UL500', 'LG27-0006', 'Monitor', 'Marco con rayón', ['Asignado']],
    ['Ricoh', 'MP 402SPF', 'RIC-402-0007', 'Impresora', null, []],
    ['Samsung', 'Galaxy A54', 'SM-A54-0008', 'Celular', null, ['Asignado', 'Disponible']],
    ['Logitech', 'MX Keys', 'LOGI-MXK-0009', 'Periférico', null, []],
    ['Epson', 'PowerLite X49', 'EPS-X49-0010', 'Proyector', 'Categoría desactivada', []],
    ['HP', 'EliteBook 840 G5', 'HPEB-840-0011', 'Notebook', 'Batería agotada', ['En reparación', 'Baja']],
    ['Apple', 'iPad 9na Gen', 'APL-IPAD-0012', 'Tablet', null, []],
  ];
  const motivos = {
    'Asignado': 'Entrega al empleado para uso diario',
    'Disponible': 'Devolución del equipo en buenas condiciones',
    'En reparación': 'Falla reportada, enviado al servicio técnico',
    'Baja': 'Equipo irreparable según informe del servicio técnico',
  };
  let dia = 1;
  for (const [marca, modelo, serie, cat, obs, recorrido] of equipos) {
    const n = (await client.query(
      "UPDATE contadores SET valor = valor + 1 WHERE nombre = 'equipo' RETURNING valor")).rows[0].valor;
    const codigo = 'EQ-' + String(n).padStart(6, '0');
    const fAlta = `2026-09-${String(dia).padStart(2, '0')} 09:00:00-03`;
    const id = (await client.query(
      `INSERT INTO equipos (codigo, marca, modelo, numero_serie, categoria_id, observaciones, creado_en, ultimo_cambio_estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
      [codigo, marca, modelo, serie, cats[cat], obs, fAlta])).rows[0].id;
    await client.query(
      `INSERT INTO historial_estados (equipo_id, estado_anterior, estado_nuevo, motivo, usuario_id, fecha)
       VALUES ($1, NULL, 'Disponible', 'Alta del equipo en el inventario', $2, $3)`, [id, oper, fAlta]);
    await client.query(
      `INSERT INTO auditoria (fecha, usuario_id, username, accion, entidad, identificador, detalle)
       VALUES ($1,$2,'operador','ALTA','EQUIPO',$3,$4)`,
      [fAlta, oper, codigo, JSON.stringify({ marca, modelo, numero_serie: serie, categoria: cat, estado: 'Disponible' })]);
    let actual = 'Disponible';
    let hora = 10;
    for (const nuevo of recorrido) {
      const f = `2026-09-${String(dia).padStart(2, '0')} ${hora}:30:00-03`;
      const quien = nuevo === 'Baja' ? admin : oper;
      await client.query(
        `INSERT INTO historial_estados (equipo_id, estado_anterior, estado_nuevo, motivo, usuario_id, fecha)
         VALUES ($1,$2,$3,$4,$5,$6)`, [id, actual, nuevo, motivos[nuevo], quien, f]);
      await client.query(
        `INSERT INTO auditoria (fecha, usuario_id, username, accion, entidad, identificador, detalle)
         VALUES ($1,$2,$3,$4,'EQUIPO',$5,$6)`,
        [f, quien, nuevo === 'Baja' ? 'admin' : 'operador', nuevo === 'Baja' ? 'BAJA' : 'CAMBIO_ESTADO', codigo,
          JSON.stringify({ estado: { anterior: actual, nuevo }, motivo: motivos[nuevo] })]);
      await client.query(
        'UPDATE equipos SET estado=$1, ultimo_cambio_estado=$2, version=version+1 WHERE id=$3', [nuevo, f, id]);
      actual = nuevo;
      hora++;
    }
    dia++;
  }
}

async function inicializar() {
  await crearEsquema();
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM usuarios');
  if (rows[0].n === 0) {
    await tx(sembrar);
    console.log('Base inicializada con datos semilla.');
  }
}

// RNF-09: restituye la base a su estado inicial conocido
async function restablecer() {
  await crearEsquema();
  await pool.query(`TRUNCATE auditoria, historial_estados, equipos, categorias, sesiones,
                    intentos_login, usuarios RESTART IDENTITY CASCADE`);
  await pool.query("UPDATE contadores SET valor = 0 WHERE nombre = 'equipo'");
  await tx(sembrar);
}

module.exports = { pool, tx, inicializar, restablecer, TZ };
