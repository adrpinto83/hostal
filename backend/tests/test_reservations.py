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
    assert rate.status_code == 201

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
