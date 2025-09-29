#!/usr/bin/env bash
# scripts/test_protocol.sh
# Protocolo de pruebas end-to-end (incluye CRUD de Rooms)
# Nota: NO usamos `set -e` para seguir con las pruebas aunque algo falle.

set -u

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@hostal.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-MiClaveSegura}"
GUEST_DOC="${GUEST_DOC:-V-12345678}"
GUEST_NAME="${GUEST_NAME:-Ana Pérez}"
GUEST_EMAIL="${GUEST_EMAIL:-ana@ejemplo.com}"
GUEST_PHONE="${GUEST_PHONE:-0414-0000000}"

ok(){ echo -e "✔ $*"; }
warn(){ echo -e "⚠ $*"; }
fail(){ echo -e "✖ $*"; }

echo "==> Backend: $BASE_URL"
echo "==> Admin:   $ADMIN_EMAIL"
echo

jq_installed=$(command -v jq || true)
if [[ -z "$jq_installed" ]]; then
  warn "jq no está instalado; se mostrarán respuestas sin formatear."
fi

# -----------------------------
# Curl wrapper robusto:
# Deja en variables globales: HTTP (código) y BODY (respuesta)
# -----------------------------
HTTP= BODY=
call(){
  local method="$1" path="$2" data="${3:-}" auth="${4:-}"
  local url="$BASE_URL$path"
  local headers=(-H "Content-Type: application/json")
  [[ -n "$auth" ]] && headers+=(-H "Authorization: Bearer $auth")

  local resp
  if [[ -n "$data" ]]; then
    resp=$(curl -sS -X "$method" "${headers[@]}" -d "$data" "$url" -w $'\n%{http_code}')
  else
    resp=$(curl -sS -X "$method" "${headers[@]}" "$url" -w $'\n%{http_code}')
  fi

  # Última línea = código HTTP; el resto = body
  HTTP="${resp##*$'\n'}"
  BODY="${resp%$'\n'*}"
}

json_or_raw(){
  if [[ -n "$jq_installed" ]]; then
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  else
    echo "$BODY"
  fi
}

# 1) Health
echo "==> Health"
call GET /health
if [[ "$HTTP" == "200" ]]; then ok "Health OK"; else fail "Health FAIL (HTTP $HTTP): $(json_or_raw)"; fi
echo

# 2) Bootstrap Admin (idempotente)
echo "==> Bootstrap Admin (idempotente)"
call POST /users/bootstrap "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
if [[ "$HTTP" == "200" ]]; then ok "Bootstrap: Admin creado"; else warn "Bootstrap: $(json_or_raw)"; fi
echo

# 3) Login
echo "==> Login"
call POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
TOKEN=""
if [[ "$HTTP" == "200" ]]; then
  TOKEN=$(echo "$BODY" | jq -r .access_token 2>/dev/null || echo "")
  if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then
    ok "Login OK. TOKEN len=${#TOKEN}"
  else
    fail "Login sin token: $(json_or_raw)"
  fi
else
  fail "Login FAIL (HTTP $HTTP): $(json_or_raw)"
fi
echo

# 4) Me
echo "==> Quien soy (/users/me)"
if [[ -n "$TOKEN" ]]; then
  call GET /users/me "" "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then ok "Me => $(json_or_raw)"; else fail "Me FAIL (HTTP $HTTP): $(json_or_raw)"; fi
else
  fail "No TOKEN; omito /users/me"
fi
echo

# 5) Guests
echo "==> Guests"
GUEST_ID=""
if [[ -n "$TOKEN" ]]; then
  call POST /guests/ "{\"full_name\":\"$GUEST_NAME\",\"document_id\":\"$GUEST_DOC\",\"phone\":\"$GUEST_PHONE\",\"email\":\"$GUEST_EMAIL\"}" "$TOKEN"
  if [[ "$HTTP" == "201" ]]; then
    GUEST_ID=$(echo "$BODY" | jq -r .id 2>/dev/null || echo "")
    ok "Guest creado: id=$GUEST_ID"
  else
    warn "Guest no creado: $(json_or_raw)"
    call GET "/guests/?q=$GUEST_DOC" "" "$TOKEN"
    GUEST_ID=$(echo "$BODY" | jq -r '.[0].id' 2>/dev/null || echo "")
    if [[ -n "$GUEST_ID" && "$GUEST_ID" != "null" ]]; then
      ok "Uso guest existente id=$GUEST_ID"
    else
      fail "No pude obtener guest id"
    fi
  fi

  if [[ -n "$GUEST_ID" && "$GUEST_ID" != "null" ]]; then
    call GET "/guests/$GUEST_ID" "" "$TOKEN"
    if [[ "$HTTP" == "200" ]]; then ok "Get Guest => $(json_or_raw)"; else fail "Get Guest FAIL (HTTP $HTTP): $(json_or_raw)"; fi
  fi
else
  fail "No TOKEN; omito Guests"
fi
echo

# 6) Devices
echo "==> Devices"
if [[ -n "$TOKEN" && -n "${GUEST_ID:-}" ]]; then
  call POST "/guests/$GUEST_ID/devices/" '{"mac":"AA:BB:CC:DD:EE:01","name":"Phone","vendor":"DemoVendor"}' "$TOKEN"
  if [[ "$HTTP" == "201" ]]; then
    DEVICE_ID=$(echo "$BODY" | jq -r .id 2>/dev/null || echo "")
    ok "Device agregado => $(json_or_raw)"

    call GET "/guests/$GUEST_ID/devices/" "" "$TOKEN"
    if [[ "$HTTP" == "200" ]]; then
      echo "Devices:"
      json_or_raw
    else
      warn "Listar devices FAIL (HTTP $HTTP): $(json_or_raw)"
    fi

    call DELETE "/guests/$GUEST_ID/devices/$DEVICE_ID" "" "$TOKEN"
    if [[ "$HTTP" == "204" ]]; then ok "Device eliminado (cleanup)"; else warn "Eliminar device FAIL (HTTP $HTTP): $(json_or_raw)"; fi
  else
    warn "No se pudo agregar device: $(json_or_raw)"
  fi
else
  fail "No TOKEN/GUEST_ID; omito Devices"
fi
echo

# 7) CRUD Rooms completo
echo "==> Rooms (CRUD completo)"
ROOM_TEMP_NUM="TMP-$(date +%s)"
ROOM_TYPE="single"
ROOM_ID=""

if [[ -n "$TOKEN" ]]; then
  # CREATE
  call POST /rooms/ "{\"number\":\"$ROOM_TEMP_NUM\",\"type\":\"$ROOM_TYPE\",\"notes\":\"room temporal para pruebas\"}" "$TOKEN"
  if [[ "$HTTP" == "201" ]]; then
    ROOM_ID=$(echo "$BODY" | jq -r .id 2>/dev/null || echo "")
    ok "Room creado => $(json_or_raw)"
  elif [[ "$HTTP" == "409" ]]; then
    warn "Número de room ya existe (inesperado). Buscando por listado…"
    call GET "/rooms/?q=$ROOM_TEMP_NUM" "" "$TOKEN"
    ROOM_ID=$(echo "$BODY" | jq -r '.[0].id' 2>/dev/null || echo "")
  else
    fail "Crear room FAIL (HTTP $HTTP): $(json_or_raw)"
  fi

  # LIST
  call GET "/rooms/?q=$ROOM_TEMP_NUM" "" "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then ok "List Rooms (filtro q=$ROOM_TEMP_NUM) OK"; else fail "List Rooms FAIL (HTTP $HTTP): $(json_or_raw)"; fi

  # GET detalle
  if [[ -n "$ROOM_ID" && "$ROOM_ID" != "null" ]]; then
    call GET "/rooms/$ROOM_ID" "" "$TOKEN"
    if [[ "$HTTP" == "200" ]]; then ok "Get Room => $(json_or_raw)"; else fail "Get Room FAIL (HTTP $HTTP): $(json_or_raw)"; fi
  fi

  # PATCH
  if [[ -n "$ROOM_ID" && "$ROOM_ID" != "null" ]]; then
    call PATCH "/rooms/$ROOM_ID" '{"notes":"notes actualizadas"}' "$TOKEN"
    if [[ "$HTTP" == "200" ]]; then ok "Patch Room => $(json_or_raw)"; else fail "Patch Room FAIL (HTTP $HTTP): $(json_or_raw)"; fi
  fi

  # DELETE
  if [[ -n "$ROOM_ID" && "$ROOM_ID" != "null" ]]; then
    call DELETE "/rooms/$ROOM_ID" "" "$TOKEN"
    if [[ "$HTTP" == "204" ]]; then ok "Delete Room OK (cleanup)"; else warn "Delete Room FAIL (HTTP $HTTP): $(json_or_raw)"; fi
  fi

  # Asegurar room id=1 para pruebas siguientes
  call GET /rooms/1 "" "$TOKEN"
  if [[ "$HTTP" != "200" ]]; then
    call POST /rooms/ '{"number":"101","type":"single","notes":"demo room estable"}' "$TOKEN"
    if [[ "$HTTP" == "201" ]]; then ok "Room 101 creado para rates/reservations"; else warn "No se pudo crear room 101: $(json_or_raw)"; fi
  fi
else
  fail "No TOKEN; omito Rooms CRUD"
fi
echo

# 8) Room Rates (room_id=1)
echo "==> Room Rates (room_id=1)"
if [[ -n "$TOKEN" ]]; then
  call POST /rooms/1/rates '{"period":"week","price_bs":500.00}' "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then ok "Rate creada => $(json_or_raw)"
  elif [[ "$HTTP" == "409" ]]; then warn "No se pudo crear rate => $(json_or_raw)"
  else fail "Crear rate FAIL (HTTP $HTTP): $(json_or_raw)"
  fi

  call GET /rooms/1/rates "" "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then
    echo "Rates:"
    json_or_raw
  else
    warn "No hay rates para room_id=1 (HTTP $HTTP): $(json_or_raw)"
  fi
else
  fail "No TOKEN; omito Room Rates"
fi
echo

# 9) Reservations
echo "==> Reservations"
if [[ -n "$TOKEN" && -n "${GUEST_ID:-}" ]]; then
  TODAY=$(date +%Y-%m-%d)
  call POST /reservations/ "{\"guest_id\":$GUEST_ID,\"room_id\":1,\"start_date\":\"$TODAY\",\"period\":\"week\",\"periods_count\":1,\"notes\":\"demo reservation\"}" "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then
    ok "Reserva creada => $(json_or_raw)"
  elif [[ "$HTTP" == "409" ]]; then
    warn "Reserva no creada => $(json_or_raw)"
  else
    fail "Crear reserva FAIL (HTTP $HTTP): $(json_or_raw)"
  fi

  call GET "/reservations/?limit=5" "" "$TOKEN"
  if [[ "$HTTP" == "200" ]]; then
    echo "Reservations:"
    json_or_raw
  else
    fail "List Reservations FAIL (HTTP $HTTP): $(json_or_raw)"
  fi
else
  fail "No TOKEN/GUEST_ID; omito Reservations"
fi
echo

# 10) Token
if [[ -n "$TOKEN" ]]; then
  echo
  ok "TOKEN listo para usar:"
  echo "$TOKEN"
fi

echo
ok "Protocolo de pruebas finalizado."
