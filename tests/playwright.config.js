// Configuración de las pruebas automatizadas de GestIT V1.
// Todas las pruebas comparten una sola base de datos, así que corren en serie (workers: 1)
// y cada archivo restablece los datos semilla antes de empezar (RNF-09).
const { defineConfig } = require('@playwright/test');

// las pruebas de tiempos se corren aparte (con la app en tiempos cortos) y guardan su propio resultado
const soloTiempos = process.argv.includes('--project=tiempos');

module.exports = defineConfig({
  testDir: '.',
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: soloTiempos ? 'reporte-html-tiempos' : 'reporte-html' }],
    ['json', { outputFile: soloTiempos ? 'resultados-tiempos.json' : 'resultados.json' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.js', grepInvert: /@tiempos/ },
    { name: 'ui', testMatch: 'ui/**/*.spec.js', grepInvert: /@tiempos/, use: { browserName: 'chromium' } },
    // Requiere la app levantada con SESSION_TIMEOUT_MIN y BLOQUEO_MIN cortos (ver README de tests)
    { name: 'tiempos', testMatch: '**/*.spec.js', grep: /@tiempos/ },
  ],
});
