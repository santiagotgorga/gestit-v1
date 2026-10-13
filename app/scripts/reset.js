// RNF-09: restituye la base de datos al estado inicial conocido (datos semilla).
// Uso:  docker compose exec app npm run reset      (o  npm run reset  sin Docker)
const { restablecer, pool } = require('../src/db');
restablecer()
  .then(() => { console.log('Base de datos restablecida al estado inicial.'); return pool.end(); })
  .catch((e) => { console.error('Error al restablecer la base:', e.message); process.exit(1); });
