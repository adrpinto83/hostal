#!/usr/bin/env python3
# scripts/test_protocol_fase1.py

import json
import os
from datetime import date, datetime, timedelta

import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@hostal.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "MiClaveSegura")


def p(title: str):
    print(title)


def dump_response(r: requests.Response):
    print("---- STATUS:", r.status_code)
    print("---- HEADERS:")
    for k, v in r.headers.items():
        print(f"   {k.lower()}: {v}")
    print("---- BODY:")
    try:
        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception:
        print(r.text)
    print("---- END\n")


def expect_2xx(r: requests.Response, ctx: str):
    if not (200 <= r.status_code < 300):
        dump_response(r)
        raise RuntimeError(f"{ctx} FAIL (status={r.status_code})")


def auth_headers(token: str | None):
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def rnd_suffix() -> str:
    import secrets

    return "".join(secrets.choice("0123456789") for _ in range(14))


def parse_conflict_end(resp_json) -> date | None:
    """
    Intenta leer 'detail.conflict_end' (yyyy-mm-dd). Devuelve date o None.
    """
    try:
        d = resp_json.get("detail") or {}
        s = d.get("conflict_end")
        if not s:
            return None
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def main():
    print(f"==> Backend: {BACKEND_URL}")
    print(f"==> Admin:   {ADMIN_EMAIL}\n")

    # Health
    p("==> Health")
    r = requests.get(f"{BACKEND_URL}/health", headers=auth_headers(None))
    dump_response(r)
    expect_2xx(r, "Health")
    if (
        r.headers.get("x-content-type-options") == "nosniff"
        and r.headers.get("x-frame-options") == "DENY"
        and r.headers.get("referrer-policy") == "no-referrer"
    ):
        print("✔ Health OK")
        print("✔ Security headers OK\n")
    else:
        print("⚠ Security headers faltantes (no bloqueante)\n")

    # Bootstrap (idempotente)
    p("==> Bootstrap Admin (idempotente)")
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    r = requests.post(
        f"{BACKEND_URL}/users/bootstrap", headers=auth_headers(None), data=json.dumps(payload)
    )
    if 200 <= r.status_code < 300:
        dump_response(r)
        print("✔ Bootstrap OK\n")
    else:
        dump_response(r)
        print(f"⚠ Bootstrap: {r.text}\n")

    # Login
    p("==> Login")
    r = requests.post(
        f"{BACKEND_URL}/auth/login",
        headers=auth_headers(None),
        data=json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
    )
    dump_response(r)
    expect_2xx(r, "Login")
    token = r.json()["access_token"]
    print(f"✔ Login OK. TOKEN len={len(token)}\n")

    # /users/me
    p("==> /users/me")
    r = requests.get(f"{BACKEND_URL}/users/me", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "/users/me")

    # Guests (idempotente por document_id)
    p("==> Create Guest")
    guest_payload = {
        "full_name": "John Test",
        "document_id": "V-12345678",
        "phone": "+58-412-0000000",
        "email": "john.test@example.com",
        "notes": "demo guest",
    }
    r = requests.post(
        f"{BACKEND_URL}/guests/", headers=auth_headers(token), data=json.dumps(guest_payload)
    )
    if 200 <= r.status_code < 300:
        dump_response(r)
        guest_id = r.json()["id"]
    elif r.status_code == 400 and "already exists" in r.text:
        # Buscarlo para recuperar su id
        r2 = requests.get(f"{BACKEND_URL}/guests/?q=V-12345678", headers=auth_headers(token))
        dump_response(r2)
        expect_2xx(r2, "Find existing guest")
        guests = r2.json()
        if not guests:
            raise RuntimeError("Guest exists error but cannot list it")
        guest_id = guests[0]["id"]
        print(f"✔ Guest ya existía (id={guest_id})\n")
    else:
        dump_response(r)
        raise RuntimeError(f"Create Guest FAIL (status={r.status_code})")

    p("==> Get Guest")
    r = requests.get(f"{BACKEND_URL}/guests/{guest_id}", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "Get Guest")

    # Devices
    p("==> Add Device")
    dev_payload = {
        "mac": "AA:BB:CC:DD:EE:01",
        "name": "Phone",
        "vendor": "DemoVendor",
        "allowed": True,
    }
    r = requests.post(
        f"{BACKEND_URL}/guests/{guest_id}/devices/",
        headers=auth_headers(token),
        data=json.dumps(dev_payload),
    )
    dump_response(r)
    expect_2xx(r, "Add Device")
    device_id = r.json()["id"]

    p("==> List Devices")
    r = requests.get(f"{BACKEND_URL}/guests/{guest_id}/devices/", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "List Devices")

    p("==> Delete Device")
    r = requests.delete(
        f"{BACKEND_URL}/guests/{guest_id}/devices/{device_id}", headers=auth_headers(token)
    )
    dump_response(r)
    expect_2xx(r, "Delete Device")

    # Rooms CRUD
    tmp_room = f"TMP-{rnd_suffix()}"
    p("==> Create Room")
    r = requests.post(
        f"{BACKEND_URL}/rooms/",
        headers=auth_headers(token),
        data=json.dumps(
            {"number": tmp_room, "type": "single", "notes": "room temporal para pruebas"}
        ),
    )
    dump_response(r)
    expect_2xx(r, "Create Room")
    room_id = r.json()["id"]

    p("==> List Rooms (filter)")
    r = requests.get(f"{BACKEND_URL}/rooms/?q={tmp_room}", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "List Rooms")

    p("==> Get Room")
    r = requests.get(f"{BACKEND_URL}/rooms/{room_id}", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "Get Room")

    p("==> Patch Room")
    r = requests.patch(
        f"{BACKEND_URL}/rooms/{room_id}",
        headers=auth_headers(token),
        data=json.dumps({"notes": "notes actualizadas"}),
    )
    dump_response(r)
    expect_2xx(r, "Patch Room")

    p("==> Delete Room (cleanup)")
    r = requests.delete(f"{BACKEND_URL}/rooms/{room_id}", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "Delete Room")

    # Room estable 101 (id=2)
    print("✔ Room 101 creado (id=2)\n")  # Ajusta si tu seed cambia

    # Rates (idempotente: 409 = ya existe)
    p("==> Create Rate")
    r = requests.post(
        f"{BACKEND_URL}/rooms/2/rates",
        headers=auth_headers(token),
        data=json.dumps({"period": "week", "price_bs": "500.00", "currency_note": "demo"}),
    )
    if 200 <= r.status_code < 300:
        dump_response(r)
        print("✔ Rate creado\n")
    elif r.status_code == 409:
        dump_response(r)
        print("✔ Rate ya existía (idempotente)\n")
    else:
        dump_response(r)
        raise RuntimeError(f"Create Rate FAIL (status={r.status_code})")

    p("==> List Rates")
    r = requests.get(f"{BACKEND_URL}/rooms/2/rates", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "List Rates")

    # Reservations (manejo idempotente del conflicto con reintento)
    p("==> Create Reservation")
    # Primer intento: fecha futura (12 días)
    start = date.today() + timedelta(days=12)
    reserve_payload = {
        "guest_id": guest_id,
        "room_id": 2,
        "start_date": start.isoformat(),
        "period": "week",
        "periods_count": 1,
        "notes": "test happy path",
    }
    r = requests.post(
        f"{BACKEND_URL}/reservations/",
        headers=auth_headers(token),
        data=json.dumps(reserve_payload),
    )

    if 200 <= r.status_code < 300:
        dump_response(r)
    elif r.status_code == 409:
        # Ver si vino conflict_end para reintentar
        try:
            body = r.json()
        except Exception:
            body = {}
        conflict_end = parse_conflict_end(body)
        dump_response(r)
        if conflict_end:
            # Nuevo intento: día siguiente al conflicto
            new_start = conflict_end + timedelta(days=1)
            print(f"⚠ Reserva en conflicto; reintentando con start_date={new_start.isoformat()}\n")
            reserve_payload["start_date"] = new_start.isoformat()
            r2 = requests.post(
                f"{BACKEND_URL}/reservations/",
                headers=auth_headers(token),
                data=json.dumps(reserve_payload),
            )
            dump_response(r2)
            expect_2xx(r2, "Create Reservation (retry)")
        else:
            raise RuntimeError("Create Reservation FAIL (409) sin conflict_end en respuesta")
    else:
        dump_response(r)
        raise RuntimeError(f"Create Reservation FAIL (status={r.status_code})")

    p("==> List Reservations")
    r = requests.get(f"{BACKEND_URL}/reservations/?limit=5", headers=auth_headers(token))
    dump_response(r)
    expect_2xx(r, "List Reservations")

    print("\n✔ TOKEN listo para usar:")
    print(token)
    print("\n✔ Protocolo de pruebas (Fase 1) finalizado.")


if __name__ == "__main__":
    main()
