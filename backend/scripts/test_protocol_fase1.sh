#!/usr/bin/env python3
import http.client
import json
import os
import random
import string
from urllib.parse import urlparse

# ===== Helpers =====

def load_config():
    with open(os.environ.get("TEST_CONFIG", "scripts/test_config.json"), "r", encoding="utf-8") as f:
        cfg = json.load(f)
    # Permite override por ENV
    cfg["backend_url"] = os.environ.get("BACKEND_URL", cfg.get("backend_url", "http://localhost:8000"))
    cfg["admin_email"] = os.environ.get("ADMIN_EMAIL", cfg["admin_email"])
    cfg["admin_password"] = os.environ.get("ADMIN_PASSWORD", cfg["admin_password"])
    return cfg

def http_request(base_url, method, path, body=None, token=None):
    """
    Solo stdlib: http.client + headers JSON.
    Devuelve (status, headers_dict, body_text)
    """
    parsed = urlparse(base_url)
    host = parsed.netloc
    is_https = parsed.scheme == "https"
    Conn = http.client.HTTPSConnection if is_https else http.client.HTTPConnection
    conn = Conn(host, timeout=20)

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    conn.request(method, path, body=data, headers=headers)
    resp = conn.getresponse()
    raw = resp.read()
    text = raw.decode("utf-8", errors="ignore")

    hdrs = dict(resp.getheaders())
    conn.close()
    return resp.status, hdrs, text

def expect_2xx(status, ctx):
    if not (200 <= status < 300):
        raise RuntimeError(f"{ctx} FAIL (status={status})")

def jload(text, allow_non_json=False):
    try:
        return json.loads(text) if text else {}
    except Exception:
        if allow_non_json:
            return {"_raw": text}
        raise

def show(title, status, headers, body_text):
    print(f"{title}")
    print(f"---- STATUS: {status}")
    print("---- HEADERS:")
    for k, v in headers.items():
        print(f"   {k}: {v}")
    print("---- BODY:")
    try:
        print(json.dumps(json.loads(body_text), indent=2, ensure_ascii=False))
    except Exception:
        print(body_text)
    print("---- END\n")

def rand_suffix(n=14):
    return "".join(random.choices(string.digits, k=n))

# ===== Flow =====

def main():
    cfg = load_config()
    base = cfg["backend_url"].rstrip("/")
    print(f"==> Backend: {base}")
    print(f"==> Admin:   {cfg['admin_email']}\n")

    # Health + Security headers (Fase 1)
    status, headers, body = http_request(base, "GET", "/health")
    show("==> Health", status, headers, body)
    expect_2xx(status, "Health")

    # Chequeo de security headers mínimos de Fase 1
    sec_missing = []
    for hk, expected in [
        ("x-content-type-options", "nosniff"),
        ("x-frame-options", "DENY"),
        ("referrer-policy", "no-referrer"),
    ]:
        val = headers.get(hk)
        if not val or val.lower() != expected.lower():
            sec_missing.append(f"{hk}={val} (expected {expected})")
    if sec_missing:
        raise RuntimeError("Security headers missing/incorrect: " + "; ".join(sec_missing))
    print("✔ Security headers OK\n")

    # Bootstrap admin (idempotente). Si no existe endpoint, sáltalo
    status, headers, body = http_request(base, "POST", "/users/bootstrap", {
        "email": cfg["admin_email"],
        "password": cfg["admin_password"]
    })
    if status in (200, 201):
        print("✔ Bootstrap OK")
    elif status == 400:
        print("⚠ Bootstrap:", body)
    elif status == 404:
        print("⚠ Bootstrap endpoint no encontrado (continuamos)")
    else:
        show("Bootstrap resp", status, headers, body)
        raise RuntimeError("Bootstrap inesperado")
    print()

    # Login
    status, headers, body = http_request(base, "POST", "/auth/login", {
        "email": cfg["admin_email"],
        "password": cfg["admin_password"]
    })
    show("==> Login", status, headers, body)
    expect_2xx(status, "Login")
    token = jload(body)["access_token"]
    print(f"✔ Login OK. TOKEN len={len(token)}\n")

    # /users/me
    status, headers, body = http_request(base, "GET", "/users/me", token=token)
    show("==> /users/me", status, headers, body)
    expect_2xx(status, "/users/me")

    # Guests: create / get
    guest = cfg["guest"]
    status, headers, body = http_request(base, "POST", "/guests/", guest, token=token)
    show("==> Create Guest", status, headers, body)
    expect_2xx(status, "Create Guest")
    guest_out = jload(body)
    guest_id = guest_out["id"]

    status, headers, body = http_request(base, "GET", f"/guests/{guest_id}", token=token)
    show("==> Get Guest", status, headers, body)
    expect_2xx(status, "Get Guest")

    # Devices (nested bajo guest)
    dev = cfg["device"]
    status, headers, body = http_request(base, "POST", f"/guests/{guest_id}/devices/", dev, token=token)
    show("==> Add Device", status, headers, body)
    expect_2xx(status, "Add Device")
    device_id = jload(body)["id"]

    status, headers, body = http_request(base, "GET", f"/guests/{guest_id}/devices/", token=token)
    show("==> List Devices", status, headers, body)
    expect_2xx(status, "List Devices")

    status, headers, body = http_request(base, "DELETE", f"/guests/{guest_id}/devices/{device_id}", token=token)
    show("==> Delete Device", status, headers, body)
    if not (200 <= status < 300 or status == 204):
        raise RuntimeError("Delete Device FAIL")

    # Rooms CRUD
    tmp_num = f"{cfg['tmp_room_prefix']}-{rand_suffix()}"
    status, headers, body = http_request(base, "POST", "/rooms/", {
        "number": tmp_num, "type": "single", "notes": "room temporal para pruebas"
    }, token=token)
    show("==> Create Room", status, headers, body)
    expect_2xx(status, "Create Room")
    room_id_tmp = jload(body)["id"]

    status, headers, body = http_request(base, "GET", f"/rooms/?q={tmp_num}", token=token)
    show("==> List Rooms (filter)", status, headers, body)
    expect_2xx(status, "List Rooms")

    status, headers, body = http_request(base, "GET", f"/rooms/{room_id_tmp}", token=token)
    show("==> Get Room", status, headers, body)
    expect_2xx(status, "Get Room")

    status, headers, body = http_request(base, "PATCH", f"/rooms/{room_id_tmp}", {
        "notes": "notes actualizadas"
    }, token=token)
    show("==> Patch Room", status, headers, body)
    expect_2xx(status, "Patch Room")

    status, headers, body = http_request(base, "DELETE", f"/rooms/{room_id_tmp}", token=token)
    show("==> Delete Room (cleanup)", status, headers, body)
    if not (200 <= status < 300 or status == 204):
        raise RuntimeError("Delete Room FAIL")

    # Room estable para rates/reservations
    status, headers, body = http_request(base, "POST", "/rooms/", {
        "number": cfg["stable_room_number"], "type": "single", "notes": "room estable"
    }, token=token)
    if 200 <= status < 300:
        room_stable_id = jload(body)["id"]
        print(f"✔ Room {cfg['stable_room_number']} creado (id={room_stable_id})\n")
    elif status == 409:
        # ya existe, búscalo
        status, headers, body = http_request(base, "GET", f"/rooms/?q={cfg['stable_room_number']}", token=token)
        lst = jload(body)
        if not lst:
            raise RuntimeError("Room estable conflict pero no se encontró via list")
        room_stable_id = lst[0]["id"]
        print(f"✔ Room {cfg['stable_room_number']} ya existía (id={room_stable_id})\n")
    else:
        show("Create Stable Room", status, headers, body)
        raise RuntimeError("Stable Room FAIL")

    # Room Rates
    rate = cfg["rate"]
    status, headers, body = http_request(base, "POST", f"/rooms/{room_stable_id}/rates", rate, token=token)
    show("==> Create Rate", status, headers, body)
    expect_2xx(status, "Create Rate")

    status, headers, body = http_request(base, "GET", f"/rooms/{room_stable_id}/rates", token=token)
    show("==> List Rates", status, headers, body)
    expect_2xx(status, "List Rates")

    # Reservations
    resv = cfg["reservation"].copy()
    resv.update({"guest_id": guest_id, "room_id": room_stable_id})
    status, headers, body = http_request(base, "POST", "/reservations/", resv, token=token)
    show("==> Create Reservation", status, headers, body)
    expect_2xx(status, "Create Reservation")

    status, headers, body = http_request(base, "GET", "/reservations/?limit=5", token=token)
    show("==> List Reservations", status, headers, body)
    expect_2xx(status, "List Reservations")

    # Token listo
    print("\n✔ TOKEN listo para usar:\n" + token)
    print("\n✔ Protocolo de pruebas (Fase 1) finalizado.")

if __name__ == "__main__":
    main()
