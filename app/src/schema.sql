-- GestIT V1 - Esquema de base de datos (PostgreSQL)
-- Todas las sentencias son idempotentes: se pueden ejecutar varias veces.

CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  username         VARCHAR(30)  NOT NULL,
  nombre           VARCHAR(100) NOT NULL,
  password_hash    TEXT         NOT NULL,
  rol              VARCHAR(20)  NOT NULL CHECK (rol IN ('Administrador','Operador')),
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- RF-02: el nombre de usuario es único (sin distinguir mayúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_username ON usuarios (lower(username));

-- RF-01: control de intentos fallidos por nombre de usuario ingresado
-- (se lleva también para nombres inexistentes, así el bloqueo no revela si el usuario existe)
CREATE TABLE IF NOT EXISTS intentos_login (
  username_norm    VARCHAR(100) PRIMARY KEY,
  fallidos         INTEGER      NOT NULL DEFAULT 0,
  bloqueado_hasta  TIMESTAMPTZ
);

-- RF-01: sesiones del lado del servidor (se invalidan al cerrar sesión o por inactividad)
CREATE TABLE IF NOT EXISTS sesiones (
  token            VARCHAR(64)  PRIMARY KEY,
  usuario_id       INTEGER      NOT NULL REFERENCES usuarios(id),
  creada_en        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ultima_actividad TIMESTAMPTZ  NOT NULL DEFAULT now(),
  activa           BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categorias (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(50)  NOT NULL,
  activa           BOOLEAN      NOT NULL DEFAULT TRUE,
  creada_en        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- RF-06: nombre de categoría único (sin distinguir mayúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_nombre ON categorias (lower(nombre));

-- HU-13 / RF-03: contador del código interno. Se incrementa dentro de la misma
-- transacción del alta: si el alta falla, el número no se consume; como los
-- equipos nunca se eliminan físicamente, un código jamás se reutiliza.
CREATE TABLE IF NOT EXISTS contadores (
  nombre           VARCHAR(30)  PRIMARY KEY,
  valor            INTEGER      NOT NULL
);
INSERT INTO contadores (nombre, valor) VALUES ('equipo', 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS equipos (
  id               SERIAL PRIMARY KEY,
  codigo           VARCHAR(12)  NOT NULL UNIQUE,
  marca            VARCHAR(50)  NOT NULL,
  modelo           VARCHAR(80)  NOT NULL,
  numero_serie     VARCHAR(50)  NOT NULL,
  categoria_id     INTEGER      NOT NULL REFERENCES categorias(id),
  observaciones    VARCHAR(500),
  estado           VARCHAR(20)  NOT NULL DEFAULT 'Disponible'
                   CHECK (estado IN ('Disponible','Asignado','En reparación','Baja')),
  version          INTEGER      NOT NULL DEFAULT 1,
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ultimo_cambio_estado TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RF-03: número de serie único en todo el inventario (incluye bajas),
-- ignorando mayúsculas y espacios al inicio y al final
CREATE UNIQUE INDEX IF NOT EXISTS ux_equipos_serie ON equipos (lower(btrim(numero_serie)));

-- RF-04: historial de cambios de estado del equipo
CREATE TABLE IF NOT EXISTS historial_estados (
  id               SERIAL PRIMARY KEY,
  equipo_id        INTEGER      NOT NULL REFERENCES equipos(id),
  estado_anterior  VARCHAR(20),
  estado_nuevo     VARCHAR(20)  NOT NULL,
  motivo           VARCHAR(500) NOT NULL,
  usuario_id       INTEGER      NOT NULL REFERENCES usuarios(id),
  fecha            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- RF-07: registro de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id               BIGSERIAL PRIMARY KEY,
  fecha            TIMESTAMPTZ  NOT NULL DEFAULT date_trunc('second', now()),
  usuario_id       INTEGER      REFERENCES usuarios(id),
  username         VARCHAR(100),          -- se guarda el nombre tal cual (incluye intentos con usuarios inexistentes)
  accion           VARCHAR(30)  NOT NULL,
  entidad          VARCHAR(20)  NOT NULL,
  identificador    VARCHAR(100),
  detalle          JSONB
);
CREATE INDEX IF NOT EXISTS ix_auditoria_fecha ON auditoria (fecha DESC);

-- RF-07: la auditoría es imborrable. Ni siquiera con acceso directo a la base
-- se permite modificar o eliminar registros (el reset de pruebas usa TRUNCATE
-- dentro del script oficial de restitución, RNF-09).
CREATE OR REPLACE FUNCTION auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los registros de auditoría no pueden modificarse ni eliminarse';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auditoria_inmutable ON auditoria;
CREATE TRIGGER tr_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();
