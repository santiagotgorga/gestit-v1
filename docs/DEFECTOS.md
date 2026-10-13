# Registro de defectos · GestIT V1

**Ciclo de pruebas 1** · 13/10/2026 · Versión probada: `main` (commit inicial) · Datos: semilla oficial (`npm run reset`)

Cada defecto se reproduce con al menos un caso automatizado de `tests/`. Los casos que fallan se dejan en rojo a propósito: cuando se corrija el defecto, el caso pasa a verde y sirve como prueba de regresión. Este registro **no incluye correcciones de código**.

## Resumen

| ID | Severidad | HU / CA | Título | Caso automatizado |
|---|---|---|---|---|
| DEF-01 | **Alta** | HU-01 · CA-01.11 | Redirección abierta: el login puede mandar al usuario a un sitio externo | `ui/acceso.spec.js` · «volver=/\evil.example» |
| DEF-02 | **Media** | HU-01 · CA-01.13 | Un login con usuario de más de 100 caracteres da error 500 y no queda auditado | `api/acceso.spec.js` · «nombre de usuario muy largo» |
| DEF-03 | **Media** | HU-11 · RF-02 | Las contraseñas de más de 72 bytes se truncan: se ingresa con solo su comienzo | `api/configuracion.spec.js` · «contraseña de más de 72 bytes» |
| DEF-04 | Baja | HU-08 · CA-08.8 | Forzar un cambio sobre un equipo en Baja devuelve otro mensaje si falta la versión o está desactualizada | `api/estados-busqueda.spec.js` · «CA-08.8 … sin enviar la versión» |
| DEF-05 | Baja | HU-06 · CA-06.4 | La pantalla de un código inexistente responde HTTP 200 en lugar de 404 | `ui/equipos.spec.js` · «CA-06.4» |
| DEF-06 | Baja | HU-12 · CA-12.6 · RNF-02 | Una fecha inexistente en el filtro de auditoría (p. ej. 30/02) da error 500 | `api/configuracion.spec.js` · «CA-12.6 una fecha mal formada» |
| DEF-07 | Baja | HU-10, HU-11 · RNF-02 | Un id no numérico en `/api/categorias/:id` o `/api/usuarios/:id` da error 500 | `api/configuracion.spec.js` · «id … no numérico» (2 casos) |
| DEF-08 | Baja | HU-04, HU-07 · RNF-02 | Un id de categoría fuera de rango (`99999999999`) da error 500 en el alta y en el filtro | `api/equipos-alta-edicion.spec.js`, `api/estados-busqueda.spec.js` · «fuera de rango» |

**Criterio de severidad.** *Alta:* riesgo de seguridad explotable desde la interfaz normal. *Media:* incumple una regla de seguridad o de auditoría, pero hace falta llamar a la API directamente o usar datos poco comunes. *Baja:* respuesta o mensaje incorrecto sin pérdida ni corrupción de datos.

---

## DEF-01 · Redirección abierta en el login (parámetro `volver`)

- **Severidad:** Alta (seguridad) · **HU:** HU-01 · CA-01.11
- **Ubicación:** `app/public/pages/login.html:48`
- **Pasos:**
  1. Abrir `http://localhost:3000/login?volver=/%5Cevil.example`. El `%5C` es una barra invertida.
  2. Ingresar con `operador` / `Operador1234`.
- **Resultado esperado:** queda dentro de GestIT (en `/equipos`), porque `volver` solo debe aceptar rutas internas.
- **Resultado obtenido:** el navegador va a `http://evil.example/`.
- **Causa probable:** la validación acepta lo que empieza con `/` y no con `//`, pero los navegadores interpretan `/\` como `//`. Lo mismo pasa con `/\/evil.example`.
- **Impacto:** alguien puede mandar un link real de GestIT que, después del login, lleva a una página falsa (phishing).

## DEF-02 · Login con usuario de más de 100 caracteres: error 500 y sin auditoría

- **Severidad:** Media · **HU:** HU-01 · CA-01.13 y RNF-02
- **Pasos:** `POST /api/login` con `{"username": "<150 letras x>", "password": "x"}`.
- **Resultado esperado:** 401 con «Usuario o contraseña incorrectos.», intento registrado como `LOGIN_FALLIDO` y contado para el bloqueo.
- **Resultado obtenido:**
  - Responde 500 «Ocurrió un error inesperado. Intentá nuevamente.».
  - El intento **no queda en la auditoría** (verificado en la base: la cantidad de `LOGIN_FALLIDO` no cambia).
  - El intento tampoco suma para el bloqueo.
- **Causa probable:** `auditoria.username` e `identificador` son `VARCHAR(100)`, pero el servidor guarda el nombre completo (`server.js:155` solo recorta la clave del bloqueo). Al fallar el INSERT de auditoría se revierte toda la transacción.
- **Nota:** desde la pantalla no se reproduce, porque el campo tiene `maxlength=100`. Solo se reproduce llamando a la API.

## DEF-03 · Contraseñas de más de 72 bytes: se puede ingresar con solo el comienzo

- **Severidad:** Media (seguridad) · **HU:** HU-11 (regla de contraseña) y HU-01
- **Pasos:**
  1. Como Administrador, crear el usuario `multibyte` con la contraseña `ñ` × 40 + `1`. Son 41 caracteres y 81 bytes, y el sistema la acepta.
  2. Ingresar como `multibyte` con la contraseña `ñ` × 36 (sin el `1`).
- **Resultado esperado:** «Usuario o contraseña incorrectos.»
- **Resultado obtenido:** ingresa (200).
- **Causa probable:** bcrypt solo usa los primeros 72 **bytes**. `validarPassword` (`server.js:45`) limita a 72 **caracteres**, y con letras acentuadas o `ñ` cada carácter ocupa 2 bytes.

## DEF-04 · CA-08.8: otro mensaje si falta la versión o está desactualizada

- **Severidad:** Baja · **HU:** HU-08 · CA-08.8
- **Pasos:** `POST /api/equipos/EQ-000011/estado` (equipo en Baja), como Administrador, con `{"estado": "Disponible", "motivo": "Motivo de prueba"}`:
  - sin el campo `version`, o
  - con `version: 1`, que está desactualizada.
- **Resultado esperado:** «Un equipo dado de baja no admite cambios de estado.».
- **Resultado obtenido:**
  - Sin `version`: 400 «Falta la versión del equipo…».
  - Con versión vieja: 409 «Otro usuario modificó el estado…».
  - En ningún caso cambia el estado, así que no hay pérdida de datos.
- **Causa probable:** en `server.js:499-505` la versión se valida antes de comprobar si el equipo está en Baja.

## DEF-05 · `/equipos/EQ-999999` responde HTTP 200

- **Severidad:** Baja · **HU:** HU-06 · CA-06.4
- **Pasos:** con sesión iniciada, abrir `http://localhost:3000/equipos/EQ-999999`.
- **Resultado esperado:** el mensaje «No se encontró ningún equipo con el código «EQ-999999».» con **HTTP 404**, como dice el CA.
- **Resultado obtenido:** el mensaje es correcto, pero la pantalla responde 200. Solo la llamada a `/api/equipos/EQ-999999` devuelve 404.
- **A definir por el grupo:** si el «HTTP 404» del CA se refiere solo a la API, alcanza con corregir el texto del CA en lugar del código.

## DEF-06 · Fecha inexistente en el filtro de auditoría: error 500

- **Severidad:** Baja · **HU:** HU-12 · CA-12.6 y RNF-02
- **Pasos:** como Administrador, `GET /api/auditoria?desde=2026-02-30`.
- **Resultado esperado:** 400 indicando que la fecha no es válida.
- **Resultado obtenido:** 500. El log muestra `date/time field value out of range`.
- **Causa probable:** `fechaOk` (`server.js:679`) usa `Date.parse`, que acepta el 30/02. PostgreSQL lo rechaza después.
- **Nota:** desde la pantalla no se reproduce, porque el selector de fecha no deja elegir días inexistentes.

## DEF-07 · Id no numérico en categorías y usuarios: error 500

- **Severidad:** Baja · **HU:** HU-10, HU-11 y RNF-02
- **Pasos:** como Administrador, cualquiera de estas llamadas:
  - `DELETE /api/categorias/abc`
  - `PUT /api/categorias/abc`
  - `PUT /api/usuarios/abc`
  - `POST /api/usuarios/abc/desactivar`
- **Resultado esperado:** 404 «La categoría no existe.» / «El usuario no existe.».
- **Resultado obtenido:** 500. El log muestra `invalid input syntax for type integer: "NaN"`.
- **Causa probable:** `parseInt(req.params.id)` devuelve `NaN` y se pasa sin validar a la consulta (`server.js:267, 289, 306, 580, 613, 632`).

## DEF-08 · Id de categoría fuera de rango: error 500

- **Severidad:** Baja · **HU:** HU-04, HU-07 y RNF-02
- **Pasos:**
  - `POST /api/equipos` con `categoria_id: "99999999999"`, o
  - `GET /api/equipos?categoria=99999999999`.
- **Resultado esperado:**
  - En el alta: 400 con error en el campo categoría.
  - En el filtro: 400 o una lista vacía.
- **Resultado obtenido:** 500. El log muestra `value "99999999999" is out of range for type integer`.
- **Causa probable:** la validación `^\d+$` (`server.js:335` y `server.js:397`) no controla el rango de `INTEGER`.

---

## Observaciones (no son defectos, pero conviene que el grupo las decida)

1. **CA-11.4, usuario «con espacios».** Los espacios del medio se rechazan, pero los del inicio y el final se recortan y el alta se acepta (`"  espacios  "` se crea como `espacios`). Es coherente con el resto del sistema, pero el CA no lo aclara.
2. **HU-11, regla de quitar el rol al último Administrador activo.** En la práctica no se puede probar. El único que podría hacerlo es ese mismo Administrador, y antes se le aplica «No podés cambiar tu propio rol.». Sugerencia: aclararlo en la HU o quitar la regla.
3. **`GET /api/auditoria/:id`.** Como Administrador responde 405 «no pueden modificarse ni eliminarse», aunque sea una lectura. No contradice ninguna HU.
4. **Observaciones del documento base.** Siguen pendientes las cuatro que ya figuran al final de `docs/HISTORIAS_DE_USUARIO.md`.
5. **Auditoría sin borrado.** Que la auditoría no se pueda modificar ni borrar se verificó por API (405) y con un trigger en la base. El `TRUNCATE` del script de reset la vacía a propósito (RNF-09), tal como dice el comentario de `schema.sql`.
