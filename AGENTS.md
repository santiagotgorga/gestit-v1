# AGENTS.md — GestIT V1

Instrucciones para agentes de código (Codex u otros) que trabajen en este repositorio.

## Qué es
GestIT: inventario de equipos del área de Sistemas (TPO Testing de Aplicaciones, Grupo 12).
La fuente de verdad funcional es `docs/HISTORIAS_DE_USUARIO.md` (HU-01..HU-13 con criterios de aceptación).
**Ningún cambio puede contradecir esas historias.** Si un pedido las contradice, avisá antes de implementar.

## Stack y comandos
- PostgreSQL 16 + Node 20 (Express) + HTML/JS/CSS sin frameworks. Todo en `docker-compose.yml`.
- Levantar: `docker compose up -d --build` → http://localhost:3000
- Restablecer datos de prueba: `docker compose exec app npm run reset`
- Carga masiva (paginación): `docker compose exec app npm run seed:masivo -- 120`
- Sin Docker: `cd app && npm install && DATABASE_URL=postgres://... npm start`

## Estructura
- `app/src/server.js` — API REST y protección de pantallas. Cada regla tiene un comentario con su HU/RF.
- `app/src/schema.sql` — esquema idempotente (índices únicos, trigger de auditoría inmutable).
- `app/src/db.js` — conexión, datos semilla y reset.
- `app/public/pages/*.html`, `app/public/js/common.js`, `app/public/css/app.css` — interfaz.

## Reglas que no se rompen
- Validación de permisos SIEMPRE en el servidor (el menú oculto no alcanza).
- Sin borrados físicos de equipos, usuarios ni auditoría; la baja es un cambio de estado.
- Auditoría: registrar toda alta/modificación/cambio de estado/baja/login/rechazo; nunca editable.
- Máquina de estados (RF-05): Disponible→Asignado/En reparación/Baja; Asignado→Disponible/En reparación;
  En reparación→Disponible/Baja; Baja terminal. Motivo 10–500 caracteres. Concurrencia por `version` (409).
- Consultas SQL siempre parametrizadas; en el front, todo texto de usuario con `esc()` o `textContent`.
- Mensajes en español, sin detalles técnicos. Códigos HTTP: 400 validación, 401 sesión, 403 permiso,
  404 no existe, 405 auditoría, 409 duplicado/conflicto, 422 regla de negocio, 423 bloqueado.
- Todo elemento interactivo nuevo lleva `data-testid` estable (RNF-08).

## Cómo trabajar
- Cambios chicos y en una rama por módulo; describí en el PR qué HU/CA toca.
- Antes de dar algo por terminado, verificá contra los CA de la HU afectada (API y pantalla).
- No cambies los usuarios ni los datos semilla sin avisar: los casos de prueba dependen de ellos.
