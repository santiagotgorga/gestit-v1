# GestIT V1 — contexto para Claude Code

Proyecto del TPO de Testing de Aplicaciones (Grupo 12). El grupo es evaluado por el **testing**, no por el código. La fuente de verdad son las historias de usuario y sus criterios de aceptación, en `docs/HISTORIAS_DE_USUARIO.md`. **Ningún cambio puede contradecirlas.** Si un pedido choca con una HU, avisá antes de tocar el código.

## Stack
- PostgreSQL 16, Node 20 + Express, HTML/CSS/JS sin frameworks, Docker Compose.
- `app/src/server.js`: API y protección de pantallas. Cada regla está comentada con su HU y su RF.
- `app/src/db.js`: datos semilla y reset.
- `app/src/schema.sql`: esquema idempotente con un trigger que hace la auditoría inmutable.
- `app/public/pages/*.html`: una página por pantalla.
- `app/public/js/common.js`: utilidades compartidas: `api()`, `esc()`, `confirmar()` y `marcarErrores()`.

## Comandos
- Levantar: `docker compose up -d --build` (http://localhost:3000)
- Resetear datos: `docker compose exec app npm run reset`
- Carga masiva: `docker compose exec app npm run seed:masivo -- 120`
- Logs: `docker compose logs -f app`

## Reglas que no se rompen
- Los permisos se validan en el servidor (`requiereAdmin`) y todo rechazo se audita como `ACCESO_DENEGADO`.
- **Máquina de estados.** Está en `TRANSICIONES` (server.js):
  - Baja es un estado terminal.
  - Un equipo Asignado no puede pasar a Baja.
  - El motivo debe tener entre 10 y 500 caracteres.
  - La concurrencia se controla con `version`.
- **Código interno.** Se genera como `EQ-000001` desde la tabla `contadores`, dentro de la misma transacción del alta: no deja huecos y no se reutiliza.
- **Número de serie.** Es único, sin distinguir mayúsculas ni espacios al inicio y al final, e incluye los equipos dados de baja.
- **Sin borrados físicos** de equipos, usuarios ni auditoría. La única excepción son las categorías sin equipos.
- **Interfaz:**
  - Todo texto va en español.
  - Cada elemento interactivo nuevo lleva un `data-testid` estable (RNF-08).
  - Los datos del usuario se muestran con `esc()` o `textContent` (RNF-04).
  - Las acciones irreversibles piden confirmación.
- **Códigos HTTP:**

  | Código | Uso |
  |---|---|
  | 400 | Validación |
  | 401 | Sin sesión |
  | 403 | Sin permiso |
  | 404 | No existe |
  | 405 | Escritura sobre la auditoría |
  | 409 | Duplicado o conflicto de concurrencia |
  | 422 | Regla de negocio |
  | 423 | Usuario bloqueado |

## Alcance
- V1 = HU-01 a HU-13.
- Fuera de V1, no implementar salvo pedido explícito:
  - personas, entregas y actas (V2)
  - QR y etiquetas (V2)
  - configuración de módulos (V2)
  - plano de puestos (V3)
  - garantías y mantenimiento (opcional)

## Forma de trabajo
- Una rama por módulo y pull request contra `main`.
- Antes de dar algo por terminado, probalo: levantá la app y verificá los criterios de aceptación de la HU afectada.
- Si encontrás un comportamiento que contradice una HU, reportalo como defecto. No lo "arregles" en silencio: el registro de defectos es parte de la entrega.
