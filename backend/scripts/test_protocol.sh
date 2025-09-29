#!/usr/bin/env bash
set -euo pipefail

# =======================
# Config (puedes sobrescribir por env)
# =======================
BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@hostal.com}"
ADMIN_PASS="${ADMIN_PASS:-MiClaveSegura}"

# Si quieres probar rates y reservas, define un ROOM_ID existente:
ROOM_ID="${ROOM_ID:-}"   # ej: export ROOM_ID=1

# Flags (0/1) para habilitar bloques opcionales
TEST_GUESTS="${TEST_GUESTS:-1}"
TEST_DEVICES="${TEST_DEVICES:-1}"
TEST_RESERVATIONS="${TEST_RESERVATIONS:-1}"
TEST_RATES="${TEST_RATES:-1}"

JQ="${JQ:-jq}"

green(){ printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[1;33m%s\033[0m\n" "$*"; }
red(){ printf "\033[1;31m%s\033[0m\n" "$*"; }

req(){  # method path [json]
  local method="$1"; shift
  local path="$1"; shift
  local url="${BASE_URL}${path}"
  if [ "$#" -gt 0 ]; then
    curl -sS -X "${method}" "${url}" -H "Content-Type: application/json" -d "$1"
  else
    curl -sS -X "${method}" "${url}"
  fi
}

auth_req(){ # method path token [json]
  local method="$1"; shift
  local path="$1"; shift
  local token="$1"; shift
  local url="${BASE_URL}${path}"
  if [ "$#" -gt 0 ]; then
    curl -sS -X "${method}" "${url}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "$1"
  else
    curl -sS -X "${method}" "${url}" -H "Authorization: Bearer ${token}"
  fi
}

endpoint_exists(){
  local path="$1"
  req GET "/openapi.json" | ${JQ} -e --arg p "${path}" '.paths[$p]' >/dev/null 2>&1
}

echo "==> Backend: ${BASE_URL}"
echo "==> Admin:   ${ADMIN_EMAIL}"

# 1) Health
if req GET "/health" | grep -q '"status":"ok"'; then
  green "✔ Health OK"
else
  red "✖ Health FAIL"
  exit 1
fi

# 2) Bootstrap admin (idempotente; tu endpoint espera UserCreate)
BOOTSTRAP_RES="$(req POST "/users/bootstrap" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" || true)"
if echo "${BOOTSTRAP_RES}" | grep -q "already exists"; then
  green "✔ Bootstrap: Admin ya existía"
elif echo "${BOOTSTRAP_RES}" | ${JQ} -e '.id' >/dev/null 2>&1; then
  green "✔ Bootstrap: Admin creado"
else
  yellow "⚠ Bootstrap respuesta: ${BOOTSTRAP_RES}"
fi

# 3) Login (tu API usa JSON, no form)
LOGIN_RES="$(req POST "/auth/login" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" || true)"
TOKEN="$(echo "${LOGIN_RES}" | ${JQ} -r '.access_token // empty' || true)"
if [[ -n "${TOKEN}" && "${#TOKEN}" -gt 20 ]]; then
  green "✔ Login OK. TOKEN len=${#TOKEN}"
else
  red "✖ Login FAIL. Respuesta: ${LOGIN_RES}"
  exit 1
fi

# 4) /users/me
ME_RES="$(auth_req GET "/users/me" "${TOKEN}" || true)"
if echo "${ME_RES}" | ${JQ} -e '.email' >/dev/null 2>&1; then
  green "✔ Me => ${ME_RES}"
else
  yellow "⚠ /users/me respuesta: ${ME_RES}"
fi

# 5) Guests (CRUD básico según tu esquema)
GUEST_ID=""
if [[ "${TEST_GUESTS}" == "1" ]] && endpoint_exists "/guests/"; then
  CREATE_GUEST_RES="$(
    auth_req POST "/guests/" "${TOKEN}" \
      '{"full_name":"John Test","document_id":"V-12345678","phone":"+58-412-0000000","email":"john.test@example.com","notes":"demo guest"}' \
      || true
  )"
  GUEST_ID="$(echo "${CREATE_GUEST_RES}" | ${JQ} -r '.id // empty' || true)"
  if [[ -n "${GUEST_ID}" ]]; then
    green "✔ Guest creado: id=${GUEST_ID}"
  else
    yellow "⚠ Guest no creado: ${CREATE_GUEST_RES}"
    # intenta tomar el primero existente
    LIST_GUESTS="$(auth_req GET "/guests/" "${TOKEN}" || true)"
    GUEST_ID="$(echo "${LIST_GUESTS}" | ${JQ} -r '.[0].id // empty' || true)"
    [[ -n "${GUEST_ID}" ]] && yellow "⚠ Uso guest existente id=${GUEST_ID}"
  fi

  # GET guest si tenemos id
  if [[ -n "${GUEST_ID}" ]]; then
    GETG="$(auth_req GET "/guests/${GUEST_ID}" "${TOKEN}" || true)"
    [[ -n "${GETG}" ]] && green "✔ Get Guest => ${GETG}"
  fi
else
  yellow "⚠ Guests deshabilitado o sin endpoint /guests/ (omito)"
fi

# 6) Devices (bajo /guests/{guest_id}/devices)
if [[ "${TEST_DEVICES}" == "1" ]] && [[ -n "${GUEST_ID}" ]] && endpoint_exists "/guests/{guest_id}/devices/"; then
  # MAC válida para validación (no tiene que existir físicamente)
  DEV_ADD_RES="$(auth_req POST "/guests/${GUEST_ID}/devices/" "${TOKEN}" '{"mac":"AA:BB:CC:DD:EE:01","name":"Phone","vendor":"DemoVendor"}' || true)"
  if echo "${DEV_ADD_RES}" | ${JQ} -e '.id' >/dev/null 2>&1; then
    green "✔ Device agregado => ${DEV_ADD_RES}"
    DEV_ID="$(echo "${DEV_ADD_RES}" | ${JQ} -r '.id')"
    LIST_DEV="$(auth_req GET "/guests/${GUEST_ID}/devices/" "${TOKEN}" || true)"
    echo "Devices:" && echo "${LIST_DEV}" | ${JQ} .
    # elimina el device para dejar limpio (opcional)
    auth_req DELETE "/guests/${GUEST_ID}/devices/${DEV_ID}" "${TOKEN}" >/dev/null 2>&1 || true
    green "✔ Device eliminado (cleanup)"
  else
    yellow "⚠ No se pudo agregar device => ${DEV_ADD_RES}"
  fi
else
  yellow "⚠ Devices deshabilitado, sin GUEST_ID o sin endpoint (omito)"
fi

# 7) Room Rates (requiere ROOM_ID existente, endpoint /rooms/{room_id}/rates)
if [[ "${TEST_RATES}" == "1" ]] && endpoint_exists "/rooms/{room_id}/rates"; then
  if [[ -z "${ROOM_ID}" ]]; then
    yellow "⚠ Define ROOM_ID para probar rates (p.ej., export ROOM_ID=1). Omito rates."
  else
    ADD_RATE_RES="$(auth_req POST "/rooms/${ROOM_ID}/rates" "${TOKEN}" '{"period":"week","price_bs":500.00,"currency_note":"promo"}' || true)"
    if echo "${ADD_RATE_RES}" | ${JQ} -e '.id' >/dev/null 2>&1; then
      green "✔ Rate creada => ${ADD_RATE_RES}"
      RATE_ID="$(echo "${ADD_RATE_RES}" | ${JQ} -r '.id')"
      LIST_RATES="$(auth_req GET "/rooms/${ROOM_ID}/rates" "${TOKEN}" || true)"
      echo "Rates:" && echo "${LIST_RATES}" | ${JQ} .
      # opcional limpiar
      auth_req DELETE "/rooms/rates/${RATE_ID}" "${TOKEN}" >/dev/null 2>&1 || true
      green "✔ Rate eliminada (cleanup)"
    else
      yellow "⚠ No se pudo crear rate => ${ADD_RATE_RES}"
    fi
  fi
else
  yellow "⚠ Rates deshabilitado o endpoint no disponible (omito)"
fi

# 8) Reservations (requiere guest_id y room_id)
if [[ "${TEST_RESERVATIONS}" == "1" ]] && endpoint_exists "/reservations/"; then
  if [[ -z "${ROOM_ID}" ]]; then
    yellow "⚠ Define ROOM_ID para probar reservas (export ROOM_ID=1). Omito reserva."
  elif [[ -z "${GUEST_ID:-}" ]]; then
    yellow "⚠ No hay GUEST_ID (crea un guest primero). Omito reserva."
  else
    RESV_RES="$(
      auth_req POST "/reservations/" "${TOKEN}" \
      '{"guest_id":'"${GUEST_ID}"',"room_id":'"${ROOM_ID}"',"start_date":"2025-10-01","period":"week","periods_count":1,"price_bs":500.00,"notes":"test"}' \
      || true
    )"
    if echo "${RESV_RES}" | ${JQ} -e '.id' >/dev/null 2>&1; then
      green "✔ Reserva creada => ${RESV_RES}"
    else
      yellow "⚠ Reserva no creada => ${RESV_RES}"
    fi

    # Listado
    LIST_RESV="$(auth_req GET "/reservations/" "${TOKEN}" || true)"
    echo "Reservations:" && echo "${LIST_RESV}" | ${JQ} .
  fi
else
  yellow "⚠ Reservations deshabilitado o sin endpoint (omito)"
fi

echo
green "✔ TOKEN listo para usar:"
echo "${TOKEN}"
echo
green "✔ Protocolo de pruebas finalizado."
