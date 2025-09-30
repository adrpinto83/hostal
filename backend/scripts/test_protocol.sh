#!/usr/bin/env bash
# scripts/test_protocol.sh
# Protocolo de pruebas end-to-end para el backend (FastAPI)

set -euo pipefail
[[ "${DEBUG:-}" == "1" ]] && set -x

# --- Requisitos --------------------------------------------------------------
CURL_BIN="$(command -v curl || true)"
if [[ -z "${CURL_BIN}" ]]; then
  echo "ERROR: 'curl' no está en PATH." >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PY_BIN="python3"
else
  PY_BIN=""
fi

SED_BIN="$(command -v sed || true)"
# ---------------------------------------------------------------------------

# --- Archivos temporales (sin mktemp) ----------------------------------------
TP_TMPDIR="${TMPDIR:-/tmp}"
if [[ ! -d "$TP_TMPDIR" || ! -w "$TP_TMPDIR" ]]; then
  TP_TMPDIR="./.tmp"
  mkdir -p "$TP_TMPDIR"
fi
make_tmp() {
  local t="${TP_TMPDIR%/}/test_protocol.$$.$RANDOM.resp"
  : > "$t" || { echo "ERROR: no puedo crear tmp en $t" >&2; exit 1; }
  echo "$t"
}

# --- Config ------------------------------------------------------------------
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@hostal.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-MiClaveSegura}"
TMP_ROOM_NUM="TMP-$(printf '%s' "$RANDOM$RANDOM$RANDOM")"
STABLE_ROOM_NUMBER="${STABLE_ROOM_NUMBER:-101}"
GUEST_DOC_ID="${GUEST_DOC_ID:-V-12345678}"

LAST_STATUS=""
LAST_BODY=""
TOKEN=""

# --- Helpers -----------------------------------------------------------------
pretty() {
  # Muestra JSON formateado si es posible; si no, imprime texto crudo.
  if [[ -n "$PY_BIN" ]]; then
    "$PY_BIN" -c 'import sys,json
raw=sys.stdin.read()
if not raw or not raw.strip():
    print("(sin cuerpo)"); sys.exit(0)
try:
    obj=json.loads(raw)
    print(json.dumps(obj, indent=2, ensure_ascii=False))
except Exception:
    sys.stdout.write(raw)
' 2>/dev/null || cat
  else
    local _in
    _in="$(cat - 2>/dev/null || true)"
    if [[ -z "${_in:-}" ]]; then
      echo "(sin cuerpo)"
    else
      printf '%s' "$_in"
    fi
  fi
}

is_2xx() { [[ "${1:-}" =~ ^2[0-9][0-9]$ ]]; }

print_body() {
  if [[ -n "${LAST_BODY:-}" ]]; then
    printf '%s' "$LAST_BODY" | pretty
  else
    echo "(sin cuerpo)"
  fi
}

extract_token_from_json() {
  local body="$1"
  local tok=""
  if [[ -n "$SED_BIN" ]]; then
    tok="$(printf '%s' "$body" | "$SED_BIN" -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    if [[ -z "$tok" || "$tok" == "null" ]]; then
      tok="$(printf '%s' "$body" | "$SED_BIN" -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    fi
  fi
  printf '%s' "$tok"
}

json_first_id_from_array() {
  local body="$1"
  if [[ -n "$PY_BIN" ]]; then
    printf '%s' "$body" | "$PY_BIN" -c 'import sys,json
try:
  data=json.loads(sys.stdin.read())
  if isinstance(data,list) and data:
    item=data[0]
    if isinstance(item,dict) and "id" in item: print(item["id"])
except: pass' 2>/dev/null || true
  else
    printf '%s' "$body" | grep -o '"id":[ ]*[0-9]\+' | head -n1 | tr -dc '0-9'
  fi
}

# call METHOD PATH [JSON_BODY]
call() {
  local METHOD="$1"
  local PATH="$2"
  local BODY="${3-}"
  local URL="${BACKEND_URL}${PATH}"

  local AUTH_HEADER=()
  if [[ -n "${TOKEN:-}" ]]; then
    AUTH_HEADER=(-H "Authorization: Bearer ${TOKEN}")
  fi

  local TMP_FILE
  TMP_FILE="$(make_tmp)"

  if [[ -n "$BODY" ]]; then
    LAST_STATUS="$("$CURL_BIN" -sS -o "$TMP_FILE" -w "%{http_code}" \
      -X "$METHOD" "$URL" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      "${AUTH_HEADER[@]}" -d "$BODY")"
  else
    LAST_STATUS="$("$CURL_BIN" -sS -o "$TMP_FILE" -w "%{http_code}" \
      -X "$METHOD" "$URL" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      "${AUTH_HEADER[@]}")"
  fi

  [[ -r "$TMP_FILE" ]] && LAST_BODY="$(<"$TMP_FILE")" || LAST_BODY=""
  if [[ "${DEBUG:-}" == "1" ]]; then
    echo "---- RESP STATUS: $LAST_STATUS"
    echo "---- RESP BODY:"; printf '%s\n' "$LAST_BODY"; echo "---- END RESP"
  fi
}

# --- Reset opcional ----------------------------------------------------------
if [[ "${RESET:-}" == "1" ]]; then
  echo "==> Reset de datos (scripts/dev_reset.sh)"
  if [[ -x "scripts/dev_reset.sh" ]]; then
    ./scripts/dev_reset.sh
  else
    echo "AVISO: scripts/dev_reset.sh no existe o no es ejecutable; saltando reset."
  fi
fi

# --- Inicio ------------------------------------------------------------------
echo "==> Backend: ${BACKEND_URL}"
echo "==> Admin:   ${ADMIN_EMAIL}"
echo

# Health
echo "==> Health"
call GET /health
if is_2xx "$LAST_STATUS"; then
  echo "✔ Health OK"
else
  echo "✖ Health FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Bootstrap admin (idempotente)
echo "==> Bootstrap Admin (idempotente)"
call POST /users/bootstrap "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
if is_2xx "$LAST_STATUS"; then
  echo -n "✔ Bootstrap: "; print_body
elif [[ "$LAST_STATUS" == "400" || "$LAST_STATUS" == "409" ]]; then
  echo -n "⚠ Bootstrap: "; print_body
else
  echo "✖ Bootstrap FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Login
echo "==> Login"
call POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
if is_2xx "$LAST_STATUS"; then
  TOKEN="$(extract_token_from_json "$LAST_BODY")"
  if [[ -z "${TOKEN:-}" || "$TOKEN" == "null" ]]; then
    echo "✖ Login OK pero no llegó token:"; print_body
    echo "Sugerencia: exporta ADMIN_PASSWORD si no es 'MiClaveSegura'."
    echo "  export ADMIN_PASSWORD='tu_clave_real'"; exit 1
  fi
  echo "✔ Login OK. TOKEN len=${#TOKEN}"
else
  echo "✖ Login FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Who am I
echo "==> Quien soy (/users/me)"
call GET /users/me
if is_2xx "$LAST_STATUS"; then
  echo -n "✔ Me => "; print_body
else
  echo "✖ /users/me FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Guests
echo "==> Guests"
call POST /guests/ "{\"full_name\":\"John Test\",\"document_id\":\"$GUEST_DOC_ID\",\"phone\":\"+58-412-0000000\",\"email\":\"john.test@example.com\",\"notes\":\"demo guest\"}"
GUEST_ID=""
if [[ "$LAST_STATUS" == "201" ]]; then
  echo -n "✔ Guest creado => "; print_body
  [[ -n "$SED_BIN" ]] && GUEST_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n 's/.*\"id\"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')"
else
  echo -n "⚠ Guest no creado: "; print_body
  call GET "/guests/?q=${GUEST_DOC_ID}"
  if is_2xx "$LAST_STATUS"; then
    GUEST_ID="$(json_first_id_from_array "$LAST_BODY")"
    [[ -z "${GUEST_ID:-}" && -n "$SED_BIN" ]] && GUEST_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n '0,/"id"[[:space:]]*:[[:space:]]*\([0-9]\+\)/s//\1/p' | head -n1)"
  fi
  [[ -z "${GUEST_ID:-}" ]] && { echo "✖ No se pudo obtener guest existente"; exit 1; }
  echo "✔ Uso guest existente id=${GUEST_ID}"
fi
call GET "/guests/${GUEST_ID}"
if is_2xx "$LAST_STATUS"; then
  echo -n "✔ Get Guest => "; print_body
else
  echo "✖ Get Guest FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Devices
echo "==> Devices"
call POST "/guests/${GUEST_ID}/devices/" '{"mac":"AA:BB:CC:DD:EE:01","name":"Phone","vendor":"DemoVendor","allowed":true}'
DEV_ID=""
if [[ "$LAST_STATUS" == "201" ]]; then
  echo -n "✔ Device agregado => "; print_body
  [[ -n "$SED_BIN" ]] && DEV_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n 's/.*\"id\"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')"
else
  echo "✖ Add Device FAIL ($LAST_STATUS):"; print_body; exit 1
fi
call GET "/guests/${GUEST_ID}/devices/"
if is_2xx "$LAST_STATUS"; then
  echo "Devices:"; print_body
else
  echo "✖ List Devices FAIL ($LAST_STATUS):"; print_body; exit 1
fi
# Revocar/eliminar device: intentar POST /revoke; si 404, usar DELETE
call POST "/guests/${GUEST_ID}/devices/${DEV_ID}/revoke" '{}'
if [[ "$LAST_STATUS" == "204" || "$LAST_STATUS" == "200" ]]; then
  echo "✔ Device eliminado (cleanup)"
else
  if [[ "$LAST_STATUS" == "404" ]]; then
    call DELETE "/guests/${GUEST_ID}/devices/${DEV_ID}"
    if [[ "$LAST_STATUS" == "204" || "$LAST_STATUS" == "200" ]]; then
      echo "✔ Device eliminado (cleanup)"
    else
      echo "✖ Delete/Revoke Device FAIL ($LAST_STATUS):"; print_body
    fi
  else
    echo "✖ Delete/Revoke Device FAIL ($LAST_STATUS):"; print_body
  fi
fi
echo

# Rooms (CRUD completo)
echo "==> Rooms (CRUD completo)"
call POST /rooms/ "{\"number\":\"${TMP_ROOM_NUM}\",\"type\":\"single\",\"notes\":\"room temporal para pruebas\"}"
ROOM_TMP_ID=""
if [[ "$LAST_STATUS" == "201" ]]; then
  echo -n "✔ Room creado => "; print_body
  [[ -n "$SED_BIN" ]] && ROOM_TMP_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n 's/.*\"id\"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')"
else
  echo "✖ Create Room FAIL ($LAST_STATUS):"; print_body; exit 1
fi

call GET "/rooms/?q=${TMP_ROOM_NUM}"
if is_2xx "$LAST_STATUS"; then
  echo "✔ List Rooms (filtro q=${TMP_ROOM_NUM}) OK"
else
  echo "✖ List Rooms FAIL ($LAST_STATUS):"; print_body; exit 1
fi

call GET "/rooms/${ROOM_TMP_ID}"
if is_2xx "$LAST_STATUS"; then
  echo -n "✔ Get Room => "; print_body
else
  echo "✖ Get Room FAIL ($LAST_STATUS):"; print_body; exit 1
fi

call PATCH "/rooms/${ROOM_TMP_ID}" "{\"notes\":\"notes actualizadas\"}"
if is_2xx "$LAST_STATUS"; then
  echo -n "✔ Patch Room => "; print_body
else
  echo "✖ Patch Room FAIL ($LAST_STATUS):"; print_body; exit 1
fi

call DELETE "/rooms/${ROOM_TMP_ID}"
if [[ "$LAST_STATUS" == "204" ]]; then
  echo "✔ Delete Room OK (cleanup)"
else
  echo "✖ Delete Room FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Room estable
echo "==> Room estable (para rates/reservations)"
STABLE_ROOM_ID=""
call GET "/rooms/?q=${STABLE_ROOM_NUMBER}"
if is_2xx "$LAST_STATUS"; then
  [[ -n "$SED_BIN" ]] && STABLE_ROOM_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n '0,/"id"[[:space:]]*:[[:space:]]*\([0-9]\+\)/s//\1/p' | head -n1)"
fi
if [[ -z "${STABLE_ROOM_ID:-}" ]]; then
  call POST /rooms/ "{\"number\":\"${STABLE_ROOM_NUMBER}\",\"type\":\"single\",\"notes\":\"demo room estable\"}"
  if [[ "$LAST_STATUS" == "201" ]]; then
    [[ -n "$SED_BIN" ]] && STABLE_ROOM_ID="$(printf '%s' "$LAST_BODY" | "$SED_BIN" -n 's/.*\"id\"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')"
    echo "✔ Room ${STABLE_ROOM_NUMBER} creado (id=${STABLE_ROOM_ID})"
  else
    echo "✖ Crear room estable FAIL ($LAST_STATUS):"; print_body; exit 1
  fi
else
  echo "✔ Uso room existente ${STABLE_ROOM_NUMBER} (id=${STABLE_ROOM_ID})"
fi
echo

# Room Rates
echo "==> Room Rates (room_id=${STABLE_ROOM_ID})"
call POST "/rooms/${STABLE_ROOM_ID}/rates" '{"period":"week","price_bs":"500.00","currency_note":"demo"}'
if [[ "$LAST_STATUS" == "201" || "$LAST_STATUS" == "200" ]]; then
  echo -n "✔ Rate creado => "; print_body
elif [[ "$LAST_STATUS" == "409" ]]; then
  echo -n "⚠ Rate ya existía => "; print_body
else
  echo -n "✖ Crear rate FAIL (HTTP $LAST_STATUS): "; print_body
fi

call GET "/rooms/${STABLE_ROOM_ID}/rates"
if is_2xx "$LAST_STATUS"; then
  echo "Rates:"; print_body
else
  echo -n "⚠ No hay rates para room_id=${STABLE_ROOM_ID} (HTTP $LAST_STATUS): "; print_body
fi
echo

# Reservations
echo "==> Reservations"
call POST /reservations/ "{\"guest_id\":${GUEST_ID},\"room_id\":${STABLE_ROOM_ID},\"start_date\":\"2025-10-13\",\"end_date\":\"2025-10-19\",\"period\":\"week\",\"periods_count\":1,\"price_bs\":\"500.00\",\"notes\":\"test happy path\"}"
if [[ "$LAST_STATUS" == "201" || "$LAST_STATUS" == "200" ]]; then
  echo -n "✔ Reserva creada => "; print_body
elif [[ "$LAST_STATUS" == "409" ]]; then
  echo -n "⚠ Reserva no creada (conflicto) => "; print_body
else
  echo -n "✖ Crear reserva FAIL (HTTP $LAST_STATUS): "; print_body
fi

call GET "/reservations/?limit=5"
if is_2xx "$LAST_STATUS"; then
  echo "Reservations:"; print_body
else
  echo "✖ List Reservations FAIL ($LAST_STATUS):"; print_body; exit 1
fi
echo

# Token listo
echo
echo "✔ TOKEN listo para usar:"
echo "${TOKEN}"
echo
echo "✔ Protocolo de pruebas finalizado."
