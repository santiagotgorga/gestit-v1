// Genera MATRIZ.md: cada criterio de aceptación (CA) de docs/HISTORIAS_DE_USUARIO.md
// con los casos automatizados que lo cubren y su último resultado.
// Uso: node matriz.js   (después de correr las pruebas; lee resultados.json y resultados-tiempos.json)
const fs = require('fs');
const path = require('path');

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'HISTORIAS_DE_USUARIO.md'), 'utf8');
const cas = [];
let hu = '';
for (const linea of doc.split('\n')) {
  const mh = linea.match(/^### (HU-\d+) · (.*)$/);
  if (mh) hu = `${mh[1]} · ${mh[2]}`;
  const mc = linea.match(/^\| (CA-\d+\.\d+) \|([^|]*)\|([^|]*)\|([^|]*)\|/);
  if (mc) cas.push({ id: mc[1], hu, entonces: mc[4].trim() });
}

const casos = [];
for (const archivo of ['resultados.json', 'resultados-tiempos.json']) {
  const p = path.join(__dirname, archivo);
  if (!fs.existsSync(p)) continue;
  const walk = (s, ruta) => {
    for (const x of s.suites || []) walk(x, [...ruta, x.title]);
    for (const sp of s.specs || []) {
      for (const t of sp.tests) {
        const r = t.results[t.results.length - 1] || {};
        casos.push({ titulo: sp.title, archivo: sp.file, proyecto: t.projectName, estado: r.status || 'no ejecutado' });
      }
    }
  };
  walk(JSON.parse(fs.readFileSync(p, 'utf8')), []);
}

const icono = { passed: '✅', failed: '❌', timedOut: '❌', skipped: '⏭️', interrupted: '⚠️' };
const filas = [];
let ok = 0;
let mal = 0;
let sin = 0;
for (const ca of cas) {
  const re = new RegExp(ca.id.replace('.', '\\.') + '(?!\\d)');
  const tests = casos.filter((c) => re.test(c.titulo));
  let estado = '⚪ sin ejecutar';
  if (tests.length) {
    const falla = tests.some((t) => t.estado !== 'passed');
    estado = falla ? '❌ falla' : '✅ pasa';
    if (falla) mal++; else ok++;
  } else sin++;
  const detalle = tests.map((t) => `${icono[t.estado] || '⚪'} [${t.proyecto}] ${t.titulo.replace(/\|/g, '\\|')}`).join('<br>');
  filas.push(`| ${ca.id} | ${ca.hu.split(' · ')[0]} | ${estado} | ${detalle || '—'} |`);
}
const extra = casos.filter((c) => !/CA-\d+\.\d+/.test(c.titulo));

const md = `# Matriz de trazabilidad · GestIT V1

Generada automáticamente con \`node matriz.js\` a partir del último resultado de las pruebas.

**Criterios de aceptación:** ${cas.length} · ✅ pasan: ${ok} · ❌ con falla: ${mal} · ⚪ sin ejecutar: ${sin}
**Casos automatizados:** ${casos.length} · ✅ ${casos.filter((c) => c.estado === 'passed').length} · ❌ ${casos.filter((c) => c.estado !== 'passed').length}

| CA | HU | Resultado | Casos de prueba |
|---|---|---|---|
${filas.join('\n')}

## Casos adicionales (robustez y seguridad, sin CA propio)

| Resultado | Proyecto | Caso |
|---|---|---|
${extra.map((c) => `| ${icono[c.estado] || '⚪'} | ${c.proyecto} | ${c.titulo.replace(/\|/g, '\\|')} |`).join('\n')}
`;
fs.writeFileSync(path.join(__dirname, 'MATRIZ.md'), md);
console.log(`MATRIZ.md: ${cas.length} CA (${ok} pasan, ${mal} con falla, ${sin} sin ejecutar), ${casos.length} casos.`);
