#!/usr/bin/env bash
set -euo pipefail

# ===============================
# Config
# ===============================
BASE="${BASE:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@hostal.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-MiClaveSegura}"
ROOM_NUMBER_STABLE="${ROOM_NUMBER_STABLE:-101}"
RESET="${RESET:-0}"     # Si =1 y existe scripts/dev_reset.sh => resetea datos antes de probar

# ===============================
# Helpers
# ===============================
jqget() { jq -r "$1" 2>/dev/null || true; }

call() {
  local METHOD=$1
  local URL=$2
  local DATA=${3:-}
  local ARGS=(-s -w "\n%{http_code}" -X "$METHOD" "$BASE$URL")
  if [ -n "${TOKEN:-}" ]; then ARGS+=(-H "Authorization: Bearer $TOKEN"); fi
  if [ -n "$DATA" ]; then ARGS+=(-H "Content-Type: application/json" -d "$DATA"); fi
  local RESP; RESP=$(curl "${ARGS[@]}")
  BODY=$(echo "$RESP" | head -n1)
  CODE=$(echo "$RESP" | tail -n1)
}

iso_plus_days() {
  # $1=YYYY-MM-DD  $2=+N (o -N)
  date -d "$1 $2 days" +%F
}

# ===============================
# Reset (opcional)
# ===============================
if [ "$RESET" = "1" ] && [ -x "./scripts/dev_reset.sh" ]; then
  echo "==> Reset de datos (scripts/dev_reset.sh)"
  ./scripts/dev_reset.sh || { echo "✖ Reset falló"; exit 1; }
fi

# ===============================
echo
echo "==> Backend: $BASE"
echo "==> Admin:   $ADMIN_EMAIL"

# ===============================
echo
echo "==> Health"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/health")
BODY=$(echo "$RESP" | head -n1)
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
  echo "✔ Health OK"
else
  echo "✖ Health FAIL (HTTP $CODE): $BODY"
fi

# ===============================
echo
echo "==> Bootstrap Admin (idempotente)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/users/bootstrap" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
BODY=$(echo "$RESP" | head -n1)
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
  echo "✔ Bootstrap OK"
else
  echo "⚠ Bootstrap: $BODY"
fi

# ===============================
echo
echo "==> Login"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
BODY=$(echo "$RESP" | head -n1)
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
  TOKEN=$(echo "$BODY" | jqget '.access_token')
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "✖ Login OK pero sin token: $BODY"
    exit 1
  fi
  echo "✔ Login OK. TOKEN len=${#TOKEN}"
else
  echo "✖ Login FAIL (HTTP $CODE): $BODY"
  exit 1
fi

# ===============================
echo
echo "==> Quien soy (/users/me)"
call GET /users/me
if [ "$CODE" = "200" ]; then
  echo "✔ Me => $BODY"
else
  echo "✖ /users/me FAIL (HTTP $CODE): $BODY"
fi

# ===============================
echo
echo "==> Guests"
call POST /guests/ '{"full_name":"John Test","document_id":"V-12345678","phone":"+58-412-0000000","email":"john.test@example.com","notes":"demo guest"}'
if [ "$CODE" = "201" ]; then
  GUEST_ID=$(echo "$BODY" | jqget .id)
  echo "✔ Guest creado => $BODY"
else
  echo "⚠ Guest no creado: $BODY"
  call GET "/guests/?q=V-12345678"
  GUEST_ID=$(echo "$BODY" | jqget '.[0].id')
  echo "✔ Uso guest existente id=$GUEST_ID"
fi
call GET "/guests/$GUEST_ID"
echo "✔ Get Guest => $BODY"

# ===============================
echo
echo "==> Devices"
call POST "/guests/$GUEST_ID/devices/" '{"mac":"AA:BB:CC:DD:EE:01","name":"Phone","vendor":"DemoVendor","allowed":true}'
if [ "$CODE" = "201" ]; then
  DEVICE_ID=$(echo "$BODY" | jqget .id)
  echo "✔ Device agregado => $BODY"
else
  echo "✖ Device FAIL (HTTP $CODE): $BODY"
fi
call GET "/guests/$GUEST_ID/devices/"
echo "Devices:"
echo "$BODY" | jq .
if [ -n "${DEVICE_ID:-}" ] && [ "$DEVICE_ID" != "null" ]; then
  call DELETE "/guests/$GUEST_ID/devices/$DEVICE_ID"
  echo "✔ Device eliminado (cleanup)"
fi

# ===============================
echo
echo "==> Rooms (CRUD completo)"
ROOM_TMP="TMP-$(date +%s)"
call POST /rooms/ "{\"number\":\"$ROOM_TMP\",\"type\":\"single\",\"notes\":\"room temporal para pruebas\"}"
if [ "$CODE" = "201" ]; then
  ROOM_TMP_ID=$(echo "$BODY" | jqget .id)
  echo "✔ Room creado => $BODY"
else
  echo "✖ Crear room FAIL (HTTP $CODE): $BODY"
fi
call GET "/rooms/?q=$ROOM_TMP"
echo "✔ List Rooms (filtro q=$ROOM_TMP) OK"
call GET "/rooms/$ROOM_TMP_ID"
echo "✔ Get Room => $BODY"
call PATCH "/rooms/$ROOM_TMP_ID" '{"notes":"notes actualizadas"}'
echo "✔ Patch Room => $BODY"
call DELETE "/rooms/$ROOM_TMP_ID"
echo "✔ Delete Room OK (cleanup)"

# ===============================
echo
echo "==> Room estable (para rates/reservations)"
ROOM_ID=""
call GET "/rooms/?q=$ROOM_NUMBER_STABLE"
ROOM_ID=$(echo "$BODY" | jqget '.[0].id // empty')
if [ -z "$ROOM_ID" ] || [ "$ROOM_ID" = "null" ]; then
  call POST /rooms/ "{\"number\":\"$ROOM_NUMBER_STABLE\",\"type\":\"single\",\"notes\":\"demo room estable\"}"
  if [ "$CODE" = "201" ]; then
    ROOM_ID=$(echo "$BODY" | jqget .id)
    echo "✔ Room $ROOM_NUMBER_STABLE creado (id=$ROOM_ID)"
  else
    call GET "/rooms/?q=$ROOM_NUMBER_STABLE"
    ROOM_ID=$(echo "$BODY" | jqget '.[0].id // empty')
    echo "✔ Uso room existente $ROOM_NUMBER_STABLE (id=$ROOM_ID)"
  fi
else
  echo "✔ Uso room existente $ROOM_NUMBER_STABLE (id=$ROOM_ID)"
fi

# ===============================
echo
echo "==> Room Rates (room_id=$ROOM_ID)"
call POST "/rooms/$ROOM_ID/rates" '{"period":"week","price_bs":"500.00","currency_note":"demo"}'
if [ "$CODE" = "201" ]; then
  echo "✔ Rate creado => $BODY"
elif [ "$CODE" = "409" ]; then
  echo "⚠ Rate ya existía => $BODY"
else
  echo "✖ Crear rate FAIL (HTTP $CODE): $BODY"
fi
call GET "/rooms/$ROOM_ID/rates"
if [ "$CODE" = "200" ]; then
  echo "Rates:"
  echo "$BODY" | jq .
else
  echo "✖ List rates FAIL (HTTP $CODE): $BODY"
fi

# ===============================
echo
echo "==> Reservations"
START=$(date -d "+14 days" +%F)
END=$(date -d "+20 days" +%F)

reservar() {
  local S="$1" E="$2"
  call POST /reservations/ "{\"guest_id\":$GUEST_ID,\"room_id\":$ROOM_ID,\"start_date\":\"$S\",\"end_date\":\"$E\",\"period\":\"week\",\"periods_count\":1,\"notes\":\"test happy path\"}"
}

reservar "$START" "$END"
if [ "$CODE" = "201" ]; then
  echo "✔ Reserva creada => $BODY"
elif [ "$CODE" = "409" ]; then
  # Auto-repair: si hay conflicto, tomar conflict_end y reintentar 7 días después
  echo "⚠ Reserva no creada => $BODY"
  CONFLICT_END=$(echo "$BODY" | jq -r '.detail.conflict_end // empty' 2>/dev/null || true)
  if [ -n "$CONFLICT_END" ] && [ "$CONFLICT_END" != "null" ]; then
    NEW_START=$(iso_plus_days "$CONFLICT_END" +1)
    NEW_END=$(iso_plus_days "$NEW_START" +6)
    echo "↻ Reintentando con fechas libres: $NEW_START -> $NEW_END"
    reservar "$NEW_START" "$NEW_END"
    if [ "$CODE" = "201" ]; then
      echo "✔ Reserva creada (reintento) => $BODY"
    else
      echo "✖ Reintento reserva FAIL (HTTP $CODE): $BODY"
    fi
  fi
else
  echo "✖ Crear reserva FAIL (HTTP $CODE): $BODY"
fi

call GET "/reservations/?limit=5"
if [ "$CODE" = "200" ]; then
  echo "Reservations:"
  echo "$BODY" | jq .
else
  echo "✖ List Reservations FAIL (HTTP $CODE): $BODY"
fi

# ===============================
echo
echo "✔ TOKEN listo para usar:"
echo "$TOKEN"
echo
echo "✔ Protocolo de pruebas finalizado."
