#!/usr/bin/env bash
set -euo pipefail

# === Config básica ===
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${PROJECT_ROOT}/.."
DATE_TAG="$(date +%F_%H%M%S)"
ZIP_NAME="hostal-backend-snapshot_${DATE_TAG}.zip"
DB_DUMP_NAME="hostal-db-backup_${DATE_TAG}.sql"

# Incluir .env real? (true/false)
INCLUDE_DOTENV=false

# === Detectar contenedor Postgres (opcional) ===
detect_db_container() {
  # prioriza un servicio llamado 'db'
  local by_name
  by_name="$(docker ps -qf 'name=db' || true)"
  if [[ -n "${by_name}" ]]; then
    echo "${by_name}"
    return
  fi
  # si no, toma el primer contenedor que corra imagen postgres
  local by_image
  by_image="$(docker ps --format '{{.ID}} {{.Image}}' | awk '/postgres/ {print $1; exit}')"
  echo "${by_image:-}"
}

DB_CONTAINER_ID="$(detect_db_container || true)"

echo "==> Proyecto: ${PROJECT_ROOT}"
echo "==> Salida:   ${OUT_DIR}/${ZIP_NAME}"
[[ -n "${DB_CONTAINER_ID}" ]] && echo "==> DB cont.:  ${DB_CONTAINER_ID}" || echo "==> DB cont.:  (no detectado; dump saltado)"

# === Crear .env.template si no existe ===
if [[ ! -f "${PROJECT_ROOT}/.env.template" ]]; then
  cat > "${PROJECT_ROOT}/.env.template" <<'EOF'
# Copia a .env y completa
SECRET_KEY=REEMPLAZAR
ACCESS_TOKEN_EXPIRE_MINUTES=60

POSTGRES_USER=hostal
POSTGRES_PASSWORD=REEMPLAZAR
POSTGRES_DB=hostal_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

DATABASE_URL=postgresql+psycopg://hostal:REEMPLAZAR@localhost:5432/hostal_db
EOF
  echo "==> Generada .env.template"
fi

# === Empaquetar código ===
pushd "${PROJECT_ROOT}" >/dev/null

ZIP_ARGS=( -r "${OUT_DIR}/${ZIP_NAME}"
  app alembic alembic.ini requirements.txt
  Makefile Dockerfile docker-compose.yml README.md .env.template
  -x "**/__pycache__/*" ".venv/*" "node_modules/*" "*.pyc" "*.pyo" "*.log" "data/*" "tmp/*"
)

if [[ "${INCLUDE_DOTENV}" == "true" && -f ".env" ]]; then
  ZIP_ARGS+=( .env )
fi

echo "==> Creando ZIP de código…"
zip "${ZIP_ARGS[@]}" >/dev/null || true
popd >/dev/null

# === Dump de base de datos (si hay contenedor) ===
if [[ -n "${DB_CONTAINER_ID}" ]]; then
  echo "==> Haciendo dump lógico de Postgres…"
  # Usa creds por defecto del docker-compose (ajusta si usas otras)
  docker exec -i "${DB_CONTAINER_ID}" \
    pg_dump -U hostal -d hostal_db --no-owner --format=plain \
    > "${OUT_DIR}/${DB_DUMP_NAME}"
  echo "==> Dump guardado en ${OUT_DIR}/${DB_DUMP_NAME}"
else
  echo "==> No se detectó contenedor Postgres, se omite el dump."
fi

# === Checksums útiles ===
echo "==> Checksums:"
( cd "${OUT_DIR}" && sha256sum "${ZIP_NAME}"* "${DB_DUMP_NAME}"* 2>/dev/null || true )

echo "✅ Backup listo:"
echo "   - ${OUT_DIR}/${ZIP_NAME}"
[[ -f "${OUT_DIR}/${DB_DUMP_NAME}" ]] && echo "   - ${OUT_DIR}/${DB_DUMP_NAME}" || true
