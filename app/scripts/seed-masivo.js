// Carga N equipos adicionales (por defecto 120) para probar paginación y rendimiento.
// Uso:  docker compose exec app npm run seed:masivo -- 120
const { tx, pool } = require('../src/db');
const N = parseInt(process.argv[2] || '120', 10);
const MARCAS = [['Lenovo', 'ThinkPad E14'], ['Dell', 'OptiPlex 3080'], ['HP', 'ProBook 450'], ['Samsung', 'Odyssey G5'], ['Logitech', 'M720']];
tx(async (db) => {
  const op = (await db.query("SELECT id FROM usuarios WHERE username = 'operador'")).rows[0].id;
  const cats = (await db.query('SELECT id, nombre FROM categorias WHERE activa ORDER BY id')).rows;
  for (let i = 1; i <= N; i++) {
    const n = (await db.query("UPDATE contadores SET valor = valor + 1 WHERE nombre = 'equipo' RETURNING valor")).rows[0].valor;
    const codigo = 'EQ-' + String(n).padStart(6, '0');
    const [marca, modelo] = MARCAS[i % MARCAS.length];
    const cat = cats[i % cats.length];
    const serie = `MAS-${String(n).padStart(6, '0')}`;
    const id = (await db.query(
      `INSERT INTO equipos (codigo, marca, modelo, numero_serie, categoria_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [codigo, marca, modelo, serie, cat.id])).rows[0].id;
    await db.query(`INSERT INTO historial_estados (equipo_id, estado_nuevo, motivo, usuario_id)
                    VALUES ($1,'Disponible','Alta del equipo en el inventario',$2)`, [id, op]);
    await db.query(`INSERT INTO auditoria (usuario_id, username, accion, entidad, identificador, detalle)
                    VALUES ($1,'operador','ALTA','EQUIPO',$2,$3)`, [op, codigo, JSON.stringify({ marca, modelo, numero_serie: serie, categoria: cat.nombre, estado: 'Disponible', origen: 'carga masiva' })]);
  }
})
  .then(() => { console.log(`${N} equipos cargados.`); return pool.end(); })
  .catch((e) => { console.error(e.message); process.exit(1); });
