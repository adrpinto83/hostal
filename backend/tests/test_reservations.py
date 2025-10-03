from datetime import date


def test_reservation_no_overlap(client, auth_headers):
    # Crear room estable
    r = client.post("/rooms/", json={"number": "R-200", "type": "single"}, headers=auth_headers)
    assert r.status_code == 201
    room_id = r.json()["id"]

    # Crear guest
    g = client.post(
        "/guests/",
        json={"full_name": "Tester", "document_id": "V-9999", "phone": "000", "email": "t@x.com"},
        headers=auth_headers,
    )
    assert g.status_code == 201
    guest_id = g.json()["id"]

    # Rate semanal
    rate = client.post(
        f"/rooms/{room_id}/rates",
        json={"period": "week", "price_bs": "200.00"},
        headers=auth_headers,
    )
    assert rate.status_code in (200, 201)

    # Reserva 1
    r1 = client.post(
        "/reservations/",
        json={
            "guest_id": guest_id,
            "room_id": room_id,
            "start_date": date(2025, 10, 13).isoformat(),
            "period": "week",
            "periods_count": 1,
        },
        headers=auth_headers,
    )
    assert r1.status_code == 200, r1.text

    # Reserva 2 solapada (debe fallar 409)
    r2 = client.post(
        "/reservations/",
        json={
            "guest_id": guest_id,
            "room_id": room_id,
            "start_date": date(2025, 10, 15).isoformat(),
            "period": "week",
            "periods_count": 1,
        },
        headers=auth_headers,
    )
    assert r2.status_code == 409, r2.text


def test_confirm_reservation_flow(client, auth_headers):
    """
    Verifica el flujo completo de confirmar una reserva:
    1. Crea una reserva (que nace en estado 'pending').
    2. La confirma y verifica que su estado cambie a 'active'.
    3. Intenta confirmarla de nuevo y verifica que la API devuelve un error.
    """
    # --- 1. Setup: Crear una reserva completa ---
    room_resp = client.post(
        "/rooms/", json={"number": "R-300", "type": "single"}, headers=auth_headers
    )
    assert room_resp.status_code == 201
    room = room_resp.json()

    guest_resp = client.post(
        "/guests/",
        json={"full_name": "Confirm Tester", "document_id": "V-112233"},
        headers=auth_headers,
    )
    assert guest_resp.status_code == 201
    guest = guest_resp.json()

    rate_resp = client.post(
        f"/rooms/{room['id']}/rates",
        json={"period": "week", "price_bs": "100.00"},
        headers=auth_headers,
    )
    assert rate_resp.status_code in (200, 201)

    reservation_in = {
        "guest_id": guest["id"],
        "room_id": room["id"],
        "start_date": "2025-11-01",
        "period": "week",
        "periods_count": 1,
    }
    r1 = client.post("/reservations/", json=reservation_in, headers=auth_headers)
    assert r1.status_code == 200, f"La creación de la reserva inicial falló: {r1.text}"
    reservation_pending = r1.json()
    assert reservation_pending["status"] == "pending"

    # --- 2. Acción y Verificación (Happy Path) ---
    reservation_id = reservation_pending["id"]
    r2 = client.post(f"/reservations/{reservation_id}/confirm", headers=auth_headers)

    # Verificar que la confirmación fue exitosa
    assert r2.status_code == 200, f"La confirmación falló: {r2.text}"
    reservation_active = r2.json()
    assert reservation_active["id"] == reservation_id
    assert reservation_active["status"] == "active"

    # --- 3. Acción y Verificación (Error Path) ---
    # Intentar confirmar la misma reserva que ya está activa
    r3 = client.post(f"/reservations/{reservation_id}/confirm", headers=auth_headers)

    # Verificar que la API previene la transición de estado inválida
    assert r3.status_code == 400, "La API no debería permitir confirmar una reserva ya activa"
    assert "Cannot confirm reservation with status 'active'" in r3.text


def test_cancel_reservation_flow(client, auth_headers):
    """
    Verifica el flujo de cancelar una reserva:
    1. Crea una reserva en estado 'pending'.
    2. La cancela y verifica que su estado cambie a 'cancelled'.
    3. Intenta cancelarla de nuevo y verifica que la API devuelve un error.
    """
    # --- 1. Setup: Crear una reserva ---
    room_resp = client.post(
        "/rooms/", json={"number": "R-400", "type": "double"}, headers=auth_headers
    )
    assert room_resp.status_code == 201
    room = room_resp.json()

    guest_resp = client.post(
        "/guests/",
        json={"full_name": "Cancel Tester", "document_id": "V-445566"},
        headers=auth_headers,
    )
    assert guest_resp.status_code == 201
    guest = guest_resp.json()

    rate_resp = client.post(
        f"/rooms/{room['id']}/rates",
        json={"period": "day", "price_bs": "50.00"},
        headers=auth_headers,
    )
    assert rate_resp.status_code in (200, 201)

    reservation_in = {
        "guest_id": guest["id"],
        "room_id": room["id"],
        "start_date": "2025-12-01",
        "period": "day",
        "periods_count": 3,
    }
    r1 = client.post("/reservations/", json=reservation_in, headers=auth_headers)
    assert r1.status_code == 200, f"La creación de la reserva inicial falló: {r1.text}"
    reservation_created = r1.json()
    assert reservation_created["status"] == "pending"

    # --- 2. Acción y Verificación (Happy Path) ---
    reservation_id = reservation_created["id"]
    r2 = client.post(f"/reservations/{reservation_id}/cancel", headers=auth_headers)

    # Verificar que la cancelación fue exitosa
    assert r2.status_code == 200, f"La cancelación falló: {r2.text}"
    reservation_cancelled = r2.json()
    assert reservation_cancelled["id"] == reservation_id
    assert reservation_cancelled["status"] == "cancelled"

    # --- 3. Acción y Verificación (Error Path) ---
    # Intentar cancelar la misma reserva que ya está cancelada
    r3 = client.post(f"/reservations/{reservation_id}/cancel", headers=auth_headers)

    # Verificar que la API previene la transición de estado inválida
    assert r3.status_code == 400, "La API no debería permitir cancelar una reserva ya cancelada"
    assert "Cannot cancel reservation with status 'cancelled'" in r3.text
