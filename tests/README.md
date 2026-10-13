# Pruebas automatizadas · GestIT V1

Suite de pruebas de API e interfaz con [Playwright](https://playwright.dev). Cubre los **119 criterios de aceptación** de HU-01 a HU-13 (`docs/HISTORIAS_DE_USUARIO.md`) y suma casos de robustez y seguridad.

- **Registro de defectos:** [`docs/DEFECTOS.md`](../docs/DEFECTOS.md)
- **Matriz de trazabilidad** (CA → casos → resultado): [`MATRIZ.md`](MATRIZ.md)

## Estructura

| Carpeta / archivo | Qué prueba |
|---|---|
| `api/acceso.spec.js` | HU-01, HU-02 y HU-03 por API: login, bloqueo, sesión, roles, 401 y 403 |
| `api/equipos-alta-edicion.spec.js` | HU-04, HU-13, HU-05 y HU-06: alta, código correlativo, edición y ficha |
| `api/estados-busqueda.spec.js` | HU-07, HU-08 y HU-09: búsqueda y filtros, máquina de estados, concurrencia y baja |
| `api/configuracion.spec.js` | HU-10, HU-11 y HU-12: categorías, usuarios y auditoría |
| `api/tiempos.spec.js` | CA-01.8 y CA-01.10: vencimiento del bloqueo y expiración de sesión (proyecto `tiempos`) |
| `ui/*.spec.js` | Los mismos módulos desde el navegador, usando los `data-testid` (RNF-08) |
| `helpers.js` | Login, reset de datos, altas y otras utilidades |
| `matriz.js` | Genera `MATRIZ.md` a partir de los resultados |

Los títulos de los casos empiezan con el CA que prueban (p. ej. `CA-08.5 …`). Así la matriz se arma sola.

## Cómo correrlas

Requisitos: la app levantada (`docker compose up -d --build`) y Node 18 o superior.

```bash
cd tests
npm install
npx playwright install chromium     # solo la primera vez

npm test                            # API + interfaz (≈ 2 minutos)
npm run test:api                    # solo API
npm run test:ui                     # solo interfaz
node matriz.js                      # regenera MATRIZ.md
npm run reporte                     # abre el reporte HTML con capturas y trazas de los fallos
```

Cada archivo restablece los datos semilla antes de empezar, con `docker compose exec -T app npm run reset`. **No corras la suite contra una base con datos reales.** Si la app no corre en Docker, indicá otro comando con `RESET_CMD`:

```bash
RESET_CMD="cd app && DATABASE_URL=postgres://gestit:gestit@localhost:5432/gestit node scripts/reset.js" npm test
```

### Pruebas de tiempos (bloqueo de 15 minutos y sesión de 30 minutos)

Se corren aparte, con la app configurada en tiempos cortos (0,1 minutos = 6 segundos):

```bash
SESSION_TIMEOUT_MIN=0.1 BLOQUEO_MIN=0.1 docker compose up -d   # desde la raíz del repo
cd tests && TIEMPO_SEG=6 npm run test:tiempos
docker compose up -d                                           # volver a los tiempos reales
```

## Resultado del ciclo 1 (13/10/2026)

| | Casos | ✅ Pasan | ❌ Fallan |
|---|---|---|---|
| API | 158 | 150 | 8 |
| Interfaz | 66 | 63 | 3 |
| Tiempos | 5 | 5 | 0 |
| **Total** | **229** | **218** | **11** |

- **Por criterio de aceptación:** 116 de 119 pasan. Fallan CA-06.4, CA-08.8 y CA-12.6.
- **Defectos:** los 11 casos que fallan corresponden a 8 defectos, documentados en [`docs/DEFECTOS.md`](../docs/DEFECTOS.md).
- **Los casos que fallan se dejan en rojo a propósito:** documentan el defecto y sirven de regresión cuando se corrija.
