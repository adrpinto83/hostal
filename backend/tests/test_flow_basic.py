from datetime import date


def auth_headers(client):
    r = client.post(
        "/auth/login", data={"username": "admin@hostal.com", "password": "MiClaveSegura"}
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_basic_guest_room_rate_reservation_flow(client, seed_admin):
    headers = auth_headers(client)

    # Guest
    g_in = {
        "full_name": "John Test",
        "document_id": "V-12345678",
        "phone": "+58-412-0000000",
        "email": "john.test@example.com",
        "notes": "demo guest",
    }
    r = client.post("/guests/", json=g_in, headers=headers)
    if r.status_code == 201:
        guest_id = r.json()["id"]
    else:
        # ya existe: búscalo
        assert r.status_code == 400
        r2 = client.get("/guests/?q=V-12345678", headers=headers)
        assert r2.status_code == 200
        guest_id = r2.json()[0]["id"]

    # Room estable 101
    room_in = {"number": "101", "type": "single", "notes": "room estable"}
    r = client.post("/rooms/", json=room_in, headers=headers)
    if r.status_code == 201:
        room_id = r.json()["id"]
    else:
        # ya existe: encuentra id
        assert r.status_code in (400, 409)
        r2 = client.get("/rooms/?q=101", headers=headers)
        assert r2.status_code == 200
        room_id = r2.json()[0]["id"]

    # Rate semana
    rate_in = {"period": "week", "price_bs": "500.00", "currency_note": "demo"}
    r = client.post(f"/rooms/{room_id}/rates", json=rate_in, headers=headers)
    assert r.status_code in (200, 409)

    # Reservation feliz (si hay choque, mover una semana)
    start = date(2025, 10, 13)
    tried = 0
    while tried < 4:
        resv_in = {
            "guest_id": guest_id,
            "room_id": room_id,
            "start_date": start.isoformat(),
            "period": "week",
            "periods_count": 1,
            "notes": "pytest",
        }
        rr = client.post("/reservations/", json=resv_in, headers=headers)
        if rr.status_code == 200:
            body = rr.json()
            assert body["start_date"] == start.isoformat()
            assert body["period"] == "week"
            break
        assert rr.status_code == 409
        detail = rr.json().get("detail", {})
        conflict_end = detail.get("conflict_end")
        if conflict_end:
            # día siguiente al fin del conflicto
            from datetime import datetime
            from datetime import timedelta as td

            start = datetime.strptime(conflict_end, "%Y-%m-%d").date() + td(days=1)
        else:
            from datetime import timedelta as td

            start = start + td(days=7)
        tried += 1
    else:
        raise AssertionError("No pude crear reserva sin solape")
