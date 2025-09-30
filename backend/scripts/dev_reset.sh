#!/usr/bin/env bash
set -euo pipefail

# Carga credenciales desde .env si existe
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-hostal}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-hostal_pass}"
POSTGRES_DB="${POSTGRES_DB:-hostal_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "==> Limpiando datos de negocio en $POSTGRES_DB@$POSTGRES_HOST:$POSTGRES_PORT (usuario $POSTGRES_USER)"

export PGPASSWORD="$POSTGRES_PASSWORD"

# Importante: NO tocamos users ni alembic_version
# Orden para evitar FKs
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
BEGIN;
TRUNCATE TABLE reservations RESTART IDENTITY CASCADE;
TRUNCATE TABLE room_rates  RESTART IDENTITY CASCADE;
TRUNCATE TABLE devices     RESTART IDENTITY CASCADE;
TRUNCATE TABLE guests      RESTART IDENTITY CASCADE;
TRUNCATE TABLE rooms       RESTART IDENTITY CASCADE;
COMMIT;
SQL

echo "✔ Datos de negocio limpiados (users y alembic_version intactos)"
