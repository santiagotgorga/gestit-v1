# GestIT V1 — Gestión de activos IT

TPO Testing de Aplicaciones · Grupo 12

Aplicación web para el inventario de equipos del área de Sistemas. Versión 1 (núcleo): login y roles, alta, edición, consulta, búsqueda y ciclo de vida de equipos, código interno correlativo, categorías, usuarios y auditoría.

Las historias de usuario y sus criterios de aceptación están en [`docs/HISTORIAS_DE_USUARIO.md`](docs/HISTORIAS_DE_USUARIO.md). El código referencia en comentarios la HU y el RF que implementa cada regla.

## Requisitos

- **Docker Desktop** (Windows/Mac) o Docker Engine + Compose (Linux).
- Nada más: Node y PostgreSQL corren dentro de los contenedores.

## Levantar la aplicación (un solo comando, RNF-06)

```bash
cd gestit-v1
docker compose up -d --build
```

Después abrí **http://localhost:3000**.

La primera vez tarda uno o dos minutos, porque descarga las imágenes. La base se crea sola con los datos de prueba.

### Usuarios de prueba

| Usuario | Contraseña | Rol / situación |
|---|---|---|
| `admin` | `Admin1234` | Administrador |
| `operador` | `Operador1234` | Operador |
| `operador2` | `Operador1234` | Operador (para probar concurrencia o bloqueo) |
| `inactivo` | `Inactivo1234` | Operador **desactivado** (para probar el login rechazado) |

### Datos semilla

**12 equipos:** `EQ-000001` a `EQ-000012`.
- `EQ-000001`, `EQ-000004` y `EQ-000006` están en estado Asignado.
- `EQ-000002` está En reparación.
- `EQ-000011` está en estado **Baja** (pasó antes por En reparación).
- `EQ-000008` tiene un historial con 3 entradas.

**8 categorías.** «Proyector» está **desactivada** y tiene un equipo asociado (`EQ-000010`).

## Comandos útiles

```bash
# Restablecer la base al estado inicial antes de cada ciclo de pruebas (RNF-09)
docker compose exec app npm run reset

# Cargar 120 equipos extra para probar la paginación (>50)
docker compose exec app npm run seed:masivo -- 120

# Ver logs / detener / borrar todo (incluida la base)
docker compose logs -f app
docker compose down
docker compose down -v
```

### Probar más rápido el bloqueo y la expiración de sesión

Los tiempos de RF-01 se configuran por variables de entorno, expresadas en minutos. Para probar sin esperar 30 o 15 minutos:

```bash
# Linux / Mac
SESSION_TIMEOUT_MIN=1 BLOQUEO_MIN=1 docker compose up -d

# Windows PowerShell
$env:SESSION_TIMEOUT_MIN=1; $env:BLOQUEO_MIN=1; docker compose up -d
```

Para volver a los valores reales, ejecutá `docker compose up -d` sin las variables.

## Correr sin Docker (opcional)

Se necesita Node 20 o superior y una base PostgreSQL creada.

```bash
cd app
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/gestit npm start
```

## Estructura

```
gestit-v1/
├── docker-compose.yml          # db (PostgreSQL 16) + app (Node 20)
├── docs/HISTORIAS_DE_USUARIO.md
└── app/
    ├── src/server.js           # API REST + protección de pantallas
    ├── src/db.js               # conexión, datos semilla y reset
    ├── src/schema.sql          # tablas, índices únicos y trigger de auditoría inmutable
    ├── scripts/                # reset.js, seed-masivo.js
    └── public/                 # pantallas HTML + JS + CSS (sin frameworks)
```

## Pantallas

| URL | Quién | HU |
|---|---|---|
| `/login` | todos | HU-01 |
| `/equipos` | todos | HU-07 |
| `/equipos/nuevo` | todos | HU-04, HU-13 |
| `/equipos/EQ-000001` | todos | HU-06, HU-08, HU-09 |
| `/equipos/EQ-000001/editar` | todos | HU-05 |
| `/categorias` | Administrador | HU-10 |
| `/usuarios` | Administrador | HU-11 |
| `/auditoria` | Administrador | HU-12 |

## API (para pruebas con Postman o con la consola del navegador)

La sesión viaja en la cookie `gestit_sid`, que se obtiene con `POST /api/login`.

| Método y ruta | Descripción |
|---|---|
| `POST /api/login` | Inicia sesión. Body: `{username, password}`. |
| `POST /api/logout` | Cierra la sesión. |
| `GET /api/sesion` | Devuelve el usuario actual. |
| `GET /api/equipos?q=&categoria=&estado=&incluirBajas=1&pagina=` | Listado con búsqueda y filtros. |
| `POST /api/equipos` | Alta. Body: `{marca, modelo, numero_serie, categoria_id, observaciones}`. |
| `GET /api/equipos/:codigo` | Ficha, historial y transiciones permitidas. |
| `PUT /api/equipos/:codigo` | Edición. |
| `POST /api/equipos/:codigo/estado` | Cambio de estado. Body: `{estado, motivo, version}`. |
| `GET/POST /api/categorias`, `PUT/DELETE /api/categorias/:id` | Categorías. |
| `POST /api/categorias/:id/desactivar` y `/activar` | Desactivar o reactivar una categoría. |
| `GET/POST /api/usuarios`, `PUT /api/usuarios/:id` | Usuarios. |
| `POST /api/usuarios/:id/password` | Cambiar contraseña. |
| `POST /api/usuarios/:id/desactivar` y `/activar` | Desactivar o reactivar un usuario. |
| `GET /api/auditoria?usuario=&accion=&entidad=&desde=AAAA-MM-DD&hasta=AAAA-MM-DD&pagina=` | Consulta de auditoría. |

En `POST /api/equipos/:codigo/estado`, `version` es la versión del equipo que devuelve la ficha y se usa para detectar cambios concurrentes.

**Códigos HTTP (RNF-09):**

| Código | Significado |
|---|---|
| 200 / 201 | OK |
| 400 | Validación |
| 401 | Sin sesión o sesión expirada |
| 403 | Sin permiso |
| 404 | No existe |
| 405 | Operación no permitida (auditoría) |
| 409 | Duplicado o conflicto de concurrencia |
| 422 | Regla de negocio (transición inválida, baja de un Asignado, etc.) |
| 423 | Usuario bloqueado |

## Identificadores para automatización (RNF-08)

Todos los elementos interactivos tienen un atributo `data-testid` estable, independiente del texto y del estilo. Algunos ejemplos:

- **Login:** `login-usuario`, `login-password`, `login-ingresar`
- **Listado:** `filtro-texto`, `btn-limpiar-filtros`
- **Ficha:** `btn-cambiar-estado`, `select-nuevo-estado`, `input-motivo`, `btn-confirmar-estado`, `btn-dar-de-baja`
