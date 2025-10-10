#!/usr/bin/env bash
set -euo pipefail

# ===============================
#  Empaquetado HostalApp (final)
# ===============================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

APP_NAME="hostal-starter-fastapi"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_BASENAME="${APP_NAME}_${STAMP}"
BACKUPS_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUPS_DIR"

DRY_RUN=0
DO_PG_DUMP=0
OUTPUT_FILE=""

# --------- helpers ----------
cinfo(){ printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
cwarn(){ printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
cerr(){  printf "\033[1;31m[ERR ]\033[0m %s\n" "$*"; }
ok(){    printf "\033[1;32m[ OK ]\033[0m %s\n" "$*"; }
need(){ command -v "$1" >/dev/null 2>&1 || { cerr "Falta '$1' en PATH"; exit 1; }; }

# --------- args ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output) OUTPUT_FILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --pg-dump) DO_PG_DUMP=1; shift ;;
    -h|--help)
      cat <<EOF
Empaqueta el proyecto para compartir.

Opciones:
  -o, --output <archivo>   Ruta del archivo de salida (.tar.zst o .tar.gz)
      --pg-dump            Incluye volcado de Postgres desde el servicio 'db'
      --dry-run            Simula sin escribir archivos
EOF
      exit 0 ;;
    *) cerr "Opción no reconocida: $1"; exit 1 ;;
  esac
done

# --------- checks ----------
need rsync
need tar
need sha256sum

HAS_ZSTD=0
if command -v zstd >/dev/null 2>&1; then HAS_ZSTD=1; fi

if [[ -z "${OUTPUT_FILE}" ]]; then
  if [[ $HAS_ZSTD -eq 1 ]]; then
    OUTPUT_FILE="${BACKUPS_DIR}/${OUT_BASENAME}.tar.zst"
  else
    OUTPUT_FILE="${BACKUPS_DIR}/${OUT_BASENAME}.tar.gz"
    cwarn "zstd no encontrado; usaré gzip."
  fi
fi

# --------- excludes como ARRAYS ----------
BACKEND_EXCLUDES=(
  ".git" ".venv" "__pycache__" "*.pyc" ".pytest_cache" ".ruff_cache" ".mypy_cache"
  "*.sqlite3" ".env" ".env.*" ".alembic"
)
FRONTEND_EXCLUDES=(
  ".git" "node_modules" "dist" ".vite" "*.log" ".env" ".env.*"
)

# --------- temp dir ----------
TEMP_DIR="$(mktemp -d -t hostal-pack-XXXXXXXX)"
trap 'rm -rf "$TEMP_DIR"' EXIT
PKG_DIR="${TEMP_DIR}/${APP_NAME}"
mkdir -p "$PKG_DIR"

cinfo "Directorio temporal: $PKG_DIR"
cinfo "Salida: ${OUTPUT_FILE}"
[[ $DRY_RUN -eq 1 ]] && cwarn "Modo simulación (no se escribirá el archivo final)."

# --------- función de copiado ----------
copy_dir(){
  local src="$1"; local dst="$2"; shift 2
  local -a excludes=("$@")
  mkdir -p "$dst"
  local -a rs=( -a --delete )
  for pat in "${excludes[@]}"; do rs+=( --exclude "$pat" ); done
  if [[ $DRY_RUN -eq 1 ]]; then
    rsync -vn "${rs[@]}" "$src/" "$dst/"
  else
    rsync -v "${rs[@]}" "$src/" "$dst/"
  fi
}

# --------- copias ----------
cinfo "Copiando backend/…"
copy_dir "backend" "$PKG_DIR/backend" "${BACKEND_EXCLUDES[@]}"

cinfo "Copiando frontend/…"
copy_dir "frontend" "$PKG_DIR/frontend" "${FRONTEND_EXCLUDES[@]}"

# raíz
for f in README.md LICENSE Makefile; do [[ -f "$f" ]] && cp -a "$f" "$PKG_DIR/" || true; done

# --------- METADATA ----------
cinfo "Generando METADATA…"
{
  echo "# Metadata"
  echo "Fecha UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
    echo "Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo n/a)"
    echo
    echo "Git status:"
    git status --porcelain || true
    echo
    echo "Últimos 5 commits:"
    git --no-pager log -n5 --pretty=format:'%h %ad %an %s' --date=short || true
  else
    echo "Repo Git: n/a"
  fi
} > "$PKG_DIR/METADATA.txt"

# --------- snapshot compose ----------
if [[ -f backend/docker-compose.yml ]]; then
  cinfo "Creando snapshot de docker-compose (backend)…"
  if [[ $DRY_RUN -eq 0 ]]; then
    (cd backend && docker compose config) > "$PKG_DIR/backend/docker-compose.snapshot.yml" || true
  fi
fi

# --------- pg dump opcional ----------
if [[ $DO_PG_DUMP -eq 1 ]]; then
  cinfo "Incluyendo volcado de Postgres desde 'db'…"
  DUMPS_DIR="$PKG_DIR/backend/_dumps"; mkdir -p "$DUMPS_DIR"
  if [[ $DRY_RUN -eq 1 ]]; then
    cwarn "Dry-run: simulando pg_dump."
  else
    if docker compose -f backend/docker-compose.yml ps >/dev/null 2>&1; then
      DUMP_NAME="pgdump_${STAMP}.sql"
      docker compose -f backend/docker-compose.yml exec -T db bash -lc '
        set -euo pipefail
        : "${POSTGRES_USER:?}"; : "${POSTGRES_DB:?}"; : "${POSTGRES_PASSWORD:?}";
        export PGPASSWORD="$POSTGRES_PASSWORD"
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F p --no-owner --no-privileges
      ' > "$DUMPS_DIR/$DUMP_NAME" || cwarn "pg_dump falló (continúo)."
      [[ -s "$DUMPS_DIR/$DUMP_NAME" ]] && ok "Dump agregado: backend/_dumps/$DUMP_NAME" || cwarn "Dump vacío/no creado."
    else
      cwarn "No se pudo acceder a docker compose del backend; no se generó dump."
    fi
  fi
fi

# --------- INSTRUCTIONS (sin here-doc) ----------
INSTRUCTIONS_CONTENT=$'# Instrucciones de Despliegue – HostalApp\n\n\
## Requisitos\n\
- Docker + Docker Compose\n\
- Node.js LTS + npm (modo dev frontend)\n\
- (Opcional) Python 3.11 si ejecutas backend sin Docker\n\n\
## Backend\n\
```bash\n\
cd backend\n\
[ -f .env ] || echo "SECRET_KEY=$(openssl rand -hex 32)" > .env\n\
docker compose up -d\n\
docker compose ps\n\
docker compose logs -f app\n\
```\n\n\
API: http://localhost:8000/api/v1  \n\
Health: http://localhost:8000/healthz  \n\
pgAdmin: http://localhost:5050\n\n\
Admin:\n\
- Email: admin@hostal.com\n\
- Password: admin\n\n\
## Frontend (dev)\n\
```bash\n\
cd frontend\n\
npm ci || npm install\n\
echo '\''VITE_API_BASE_URL=http://localhost:8000/api/v1'\'' > .env.local\n\
npm run dev\n\
```\n\
Abrir: http://localhost:5173\n\n\
## Restaurar dump (si existe backend/_dumps/pgdump_*.sql)\n\
```bash\n\
docker compose -f backend/docker-compose.yml exec -T db bash -lc '\''\n\
  export PGPASSWORD="$POSTGRES_PASSWORD";\n\
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /var/lib/postgresql/data/import.sql\n\
'\''\n\
# o desde el host con psql apuntando al archivo.\n\
```\n'
printf "%s" "$INSTRUCTIONS_CONTENT" > "$PKG_DIR/INSTRUCTIONS.md"

# --------- empaquetar ----------
if [[ $DRY_RUN -eq 1 ]]; then
  cwarn "Dry-run: salto compresión y checksum."
  exit 0
fi

cinfo "Comprimiendo…"
TAR_INPUT_DIR="$(basename "$PKG_DIR")"
mkdir -p "$(dirname "$OUTPUT_FILE")"

if command -v zstd >/dev/null 2>&1 && [[ "${OUTPUT_FILE##*.}" == "zst" ]]; then
  ( cd "$TEMP_DIR"
    tar --sort=name --owner=0 --group=0 --numeric-owner --mtime='UTC 2020-01-01' -cf - "$TAR_INPUT_DIR" \
      | zstd -19 -T0 -o "$OUTPUT_FILE"
  )
else
  ( cd "$TEMP_DIR"
    tar --sort=name --owner=0 --group=0 --numeric-owner --mtime='UTC 2020-01-01' -czf "$OUTPUT_FILE" "$TAR_INPUT_DIR"
  )
fi

# --------- checksum ----------
cinfo "Calculando checksum…"
sha256sum "$OUTPUT_FILE" | tee "${OUTPUT_FILE}.sha256" >/dev/null

ok "Paquete creado: $OUTPUT_FILE"
ok "Checksum (SHA256): $(cut -d' ' -f1 "${OUTPUT_FILE}.sha256")"
