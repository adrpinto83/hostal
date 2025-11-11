"""
Tests para endpoints de tarifas de habitaciones (Room Rates).
"""
import pytest


def test_add_rate_to_room(client, seed_admin, auth_headers):
    """Test crear una tarifa para una habitación."""
    # Primero crear una habitación
    room_data = {"number": "101", "type": "single", "notes": "Test room"}
    r = client.post("/api/v1/rooms/", json=room_data, headers=auth_headers)
    assert r.status_code == 201
    room_id = r.json()["id"]

    # Agregar tarifa
    rate_data = {"period": "day", "price_bs": 150.0, "currency_note": "BS"}
    r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
    assert r.status_code == 200, r.text
    rate = r.json()
    assert rate["period"] == "day"
    assert float(rate["price_bs"]) == 150.0
    assert rate["currency_note"] == "BS"
    assert rate["room_id"] == room_id


def test_add_duplicate_rate_fails(client, seed_admin, auth_headers):
    """Test que no se puede agregar tarifa duplicada para el mismo período."""
    # Crear habitación
    room_data = {"number": "102", "type": "double"}
    r = client.post("/api/v1/rooms/", json=room_data, headers=auth_headers)
    room_id = r.json()["id"]

    # Primera tarifa
    rate_data = {"period": "week", "price_bs": 500.0}
    r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
    assert r.status_code == 200

    # Intentar agregar tarifa duplicada
    r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
    assert r.status_code == 409
    assert "already exists" in r.json()["detail"]


def test_list_rates_for_room(client, seed_admin, auth_headers):
    """Test listar todas las tarifas de una habitación."""
    # Crear habitación
    room_data = {"number": "103", "type": "suite"}
    r = client.post("/api/v1/rooms/", json=room_data, headers=auth_headers)
    room_id = r.json()["id"]

    # Agregar múltiples tarifas
    periods = [
        {"period": "day", "price_bs": 200.0},
        {"period": "week", "price_bs": 1200.0},
        {"period": "month", "price_bs": 4500.0},
    ]

    for rate_data in periods:
        r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
        assert r.status_code == 200

    # Listar tarifas
    r = client.get(f"/api/v1/rooms/{room_id}/rates", headers=auth_headers)
    assert r.status_code == 200
    rates = r.json()
    assert len(rates) == 3


def test_delete_rate(client, seed_admin, auth_headers):
    """Test eliminar una tarifa."""
    # Crear habitación y tarifa
    room_data = {"number": "104", "type": "single"}
    r = client.post("/api/v1/rooms/", json=room_data, headers=auth_headers)
    room_id = r.json()["id"]

    rate_data = {"period": "day", "price_bs": 100.0}
    r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
    rate_id = r.json()["id"]

    # Eliminar tarifa
    r = client.delete(f"/api/v1/rooms/rates/{rate_id}", headers=auth_headers)
    assert r.status_code == 204

    # Verificar que se eliminó
    r = client.get(f"/api/v1/rooms/{room_id}/rates", headers=auth_headers)
    rates = r.json()
    assert len(rates) == 0


def test_add_rate_to_nonexistent_room_fails(client, seed_admin, auth_headers):
    """Test que falla al agregar tarifa a habitación inexistente."""
    rate_data = {"period": "day", "price_bs": 100.0}
    r = client.post("/api/v1/rooms/99999/rates", json=rate_data, headers=auth_headers)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_all_period_types(client, seed_admin, auth_headers):
    """Test que se pueden crear tarifas para todos los tipos de período."""
    # Crear habitación
    room_data = {"number": "105", "type": "double"}
    r = client.post("/api/v1/rooms/", json=room_data, headers=auth_headers)
    room_id = r.json()["id"]

    # Probar todos los períodos válidos
    periods = ["day", "week", "fortnight", "month"]

    for period in periods:
        rate_data = {"period": period, "price_bs": 100.0}
        r = client.post(f"/api/v1/rooms/{room_id}/rates", json=rate_data, headers=auth_headers)
        assert r.status_code == 200, f"Failed for period {period}: {r.text}"
        assert r.json()["period"] == period
