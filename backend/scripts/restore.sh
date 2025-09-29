#!/usr/bin/env bash
set -euo pipefail

# Uso: ./restore.sh /ruta/al/hostal-backend-snapshot_YYYY-MM-DD_HHMMSS.zip
if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo.zip> [dump.sql]"
  exit 1
fi

ZIP_PATH="$(realpath "$1")"
DUMP_PATH="${2:-}"

TARGET_DIR="$(pwd)/hostal-backend_restored_$(date +%F_%H%M%S)"
mkdir -p "${TARGET_DIR}"

echo "==> Descomprimiendo en: ${TARGET_DIR}"
unzip -q "${ZIP_PATH}" -d "${TARGET_DIR}"

pushd "${TARGET_DIR}" >/dev/null

# 1) Preparar .env
if [[ -f ".env" ]]; then
  echo "==> .env ya existe."
else
  if [[ -f ".env.template" ]]; then
    cp .env.template .env
    echo "==> Copiado .env.template → .env (recuerda editar valores reales)"
  else
    echo "⚠️ No hay .env ni .env.template, crea uno."
  fi
fi

# 2) venv + deps
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3) Levantar Postgres si hay docker-compose
if [[ -f "docker-compose.yml" ]]; then
  echo "==> Levantando servicios con docker compose (db)…"
  docker compose up -d db
  sleep 3
else
  echo "⚠️ No hay docker-compose.yml; asegúrate de tener Postgres disponible."
fi

# 4) Migraciones
alembic upgrade head

# 5) Restaurar dump (opcional)
if [[ -n "${DUMP_PATH}" && -f "${DUMP_PATH}" ]]; then
  echo "==> Restaurando dump: ${DUMP_PATH}"
  # Detecta contenedor db
  DB_CONT="$(docker ps -qf 'name=db' || true)"
  if [[ -n "${DB_CONT}" ]]; then
    cat "${DUMP_PATH}" | docker exec -i "${DB_CONT}" psql -U hostal -d hostal_db
  else
    echo "⚠️ No se detectó contenedor 'db'. Restaura con psql local si corresponde."
  fi
fi

# 6) Arranque de la API
echo "==> Iniciando API (CTRL+C para salir)…"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
