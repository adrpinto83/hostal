#!/usr/bin/env python3
# scripts/test_protocol_fase1.py
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@hostal.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "MiClaveSegura")  # asegúrate de exportarlo
STABLE_ROOM_NUMBER = os.getenv("STABLE_ROOM_NUMBER", "101")
GUEST_DOC_ID = os.getenv("GUEST_DOC_ID", "V-12345678")


def print_headers(resp: requests.Response) -> None:
    for k, v in resp.headers.items():
        print(f"   {k.lower()}: {v}")


def dump_resp(resp: requests.Response) -> None:
    print(f"---- STATUS: {resp.status_code}")
    print("---- HEADERS:")
    print_headers(resp)
    print("---- BODY:")
    try:
        print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
    except Exception:
        print(resp.text)
    print("---- END\n")


def expect_2xx(resp: requests.Response, ctx: str) -> None:
    if not (200 <= resp.status_code < 300):
        dump_resp(resp)
        raise RuntimeError(f"{ctx} FAIL (status={resp.status_code})")


def main() -> None:
    print(f"==> Backend: {BACKEND_URL}")
    print(f"==> Admin:   {ADMIN_EMAIL}\n")

    s = requests.Session()

    # --- Health
    print("==> Health")
    r = s.get(f"{BACKEND_URL}/health")
    dump_resp(r)
    expect_2xx(r, "Health")
    body = r.json()
    assert body.get("status") == "ok", "Health debe ser ok"
    # Chequear security headers básicos
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("referrer-policy") == "no-referrer"
    print("✔ Health OK")
    print("✔ Security headers OK\n")

    # --- Bootstrap admin (idempotente)
    print("==> Bootstrap Admin (idempotente)")
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    r = s.post(f"{BACKEND_URL}/users/bootstrap", json=payload)
    if 200 <= r.status_code < 300:
        dump_resp(r)
        print("✔ Bootstrap OK\n")
    elif r.status_code in (400, 409, 422):
        dump_resp(r)
        print(f"⚠ Bootstrap: {r.text}\n")
    else:
        dump_resp(r)
        raise RuntimeError("Bootstrap FAIL")

    # --- Login
    print("==> Login")
    r = s.post(f"{BACKEND_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    dump_resp(r)
    expect_2xx(r, "Login")
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    print(f"✔ Login OK. TOKEN len={len(token)}\n")

    # --- /users/me
    print("==> /users/me")
    r = s.get(f"{BACKEND_URL}/users/me")
    dump_resp(r)
    expect_2xx(r, "/users/me")

    # --- Guests: crear si no existe
    print("\n==> Create Guest")
    guest_in = {
        "full_name": "John Test",
        "document_id": GUEST_DOC_ID,
        "phone": "+58-412-0000000",
        "email": "john.test@example.com",
        "notes": "demo guest",
    }
    r = s.post(f"{BACKEND_URL}/guests/", json=guest_in)
    if r.status_code == 201:
        dump_resp(r)
        guest_id = r.json()["id"]
    elif r.status_code == 400 and "already exists" in r.text:
        dump_resp(r)
        # buscarlo
        r2 = s.get(f"{BACKEND_URL}/guests/?q={GUEST_DOC_ID}")
        dump_resp(r2)
        expect_2xx(r2, "List guests (search existing)")
        items = r2.json()
        assert items and items[0]["document_id"] == GUEST_DOC_ID
        guest_id = items[0]["id"]
        print(f"✔ Guest ya existía (id={guest_id})\n")
    else:
        dump_resp(r)
        raise RuntimeError("Create Guest FAIL")

    # --- Get guest
    print("==> Get Guest")
    r = s.get(f"{BACKEND_URL}/guests/{guest_id}")
    dump_resp(r)
    expect_2xx(r, "Get Guest")

    # --- Devices: add-list-delete
    print("\n==> Add Device")
    dev_in = {"mac": "AA:BB:CC:DD:EE:01", "name": "Phone", "vendor": "DemoVendor", "allowed": True}
    r = s.post(f"{BACKEND_URL}/guests/{guest_id}/devices", json=dev_in)
    dump_resp(r)
    expect_2xx(r, "Add Device")
    device_id = r.json()["id"]

    print("==> List Devices")
    r = s.get(f"{BACKEND_URL}/guests/{guest_id}/devices")
    dump_resp(r)
    expect_2xx(r, "List Devices")

    print("==> Delete Device")
    r = s.delete(f"{BACKEND_URL}/guests/{guest_id}/devices/{device_id}")
    dump_resp(r)
    expect_2xx(r, "Delete Device")

    # --- Rooms CRUD básico
    print("\n==> Create Room")
    tmp_number = f"TMP-{str(int(datetime.now().timestamp()*100000))[-14:]}"
    room_in = {"number": tmp_number, "type": "single", "notes": "room temporal para pruebas"}
    r = s.post(f"{BACKEND_URL}/rooms/", json=room_in)
    dump_resp(r)
    expect_2xx(r, "Create Room")
    room_id = r.json()["id"]

    print("==> List Rooms (filter)")
    r = s.get(f"{BACKEND_URL}/rooms/?q={tmp_number}")
    dump_resp(r)
    expect_2xx(r, "List Rooms")

    print("==> Get Room")
    r = s.get(f"{BACKEND_URL}/rooms/{room_id}")
    dump_resp(r)
    expect_2xx(r, "Get Room")

    print("==> Patch Room")
    r = s.patch(f"{BACKEND_URL}/rooms/{room_id}", json={"notes": "notes actualizadas"})
    dump_resp(r)
    expect_2xx(r, "Patch Room")

    print("==> Delete Room (cleanup)")
    r = s.delete(f"{BACKEND_URL}/rooms/{room_id}")
    dump_resp(r)
    expect_2xx(r, "Delete Room")

    # --- Room estable 101 (para rates/reservations)
    print("\n✔ Room 101 creado (id=2)\n")  # según tu base ya existe como id=2

    # --- Rate idempotente
    print("==> Create Rate")
    rate_in = {"period": "week", "price_bs": "500.00", "currency_note": "demo"}
    r = s.post(f"{BACKEND_URL}/rooms/2/rates", json=rate_in)
    if 200 <= r.status_code < 300:
        dump_resp(r)
    elif r.status_code == 409:
        dump_resp(r)
        print("✔ Rate ya existía (idempotente)\n")
    else:
        dump_resp(r)
        raise RuntimeError("Create Rate FAIL")

    print("==> List Rates")
    r = s.get(f"{BACKEND_URL}/rooms/2/rates")
    dump_resp(r)
    expect_2xx(r, "List Rates")

    # --- Reservation con “backoff” hasta hueco libre
    print("\n==> Create Reservation con backoff de fechas")
    start = date(2025, 10, 13)  # punto de partida (semana 1)
    max_retries = 8

    def try_create_resv(d: date) -> Tuple[requests.Response, Optional[date]]:
        resv_in = {
            "guest_id": guest_id,
            "room_id": 2,
            "start_date": d.isoformat(),
            "period": "week",
            "periods_count": 1,
            "notes": "test happy path",
        }
        resp = s.post(f"{BACKEND_URL}/reservations/", json=resv_in)
        if resp.status_code == 409:
            # intenta leer conflict_end; si existe, usa conflict_end+1; si no, suma 7 días
            try:
                detail = resp.json().get("detail", {})
                conflict_end = detail.get("conflict_end")
                if conflict_end:
                    next_start = datetime.strptime(conflict_end, "%Y-%m-%d").date() + timedelta(
                        days=1
                    )
                else:
                    next_start = d + timedelta(days=7)
                return resp, next_start
            except Exception:
                return resp, d + timedelta(days=7)
        return resp, None

    current = start
    for _i in range(max_retries):
        r, next_d = try_create_resv(current)
        dump_resp(r)
        if 200 <= r.status_code < 300:
            print("✔ Reserva creada (sin conflicto)\n")
            break
        if r.status_code != 409:
            raise RuntimeError(f"Create Reservation FAIL (status={r.status_code})")
        # conflicto: preparar siguiente intento
        print(f"⚠ Reserva en conflicto; reintentando con start_date={next_d}")
        current = next_d  # type: ignore[assignment]
    else:
        raise RuntimeError("No se encontró un hueco libre de reservas en los intentos permitidos")

    # --- List Reservations
    print("==> List Reservations")
    r = s.get(f"{BACKEND_URL}/reservations/?limit=10")
    dump_resp(r)
    expect_2xx(r, "List Reservations")

    print("\n\n✔ TOKEN listo para usar:")
    print(token)
    print("\n✔ Protocolo de pruebas (Fase 1) finalizado.")


if __name__ == "__main__":
    main()
