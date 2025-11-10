"""
Tests para endpoints de dispositivos (Devices).
"""
import pytest


def test_add_device_to_guest(client, seed_admin, auth_headers):
    """Test agregar un dispositivo a un huésped."""
    # Crear huésped primero
    guest_data = {
        "full_name": "Juan Pérez",
        "document_id": "V-12345678",
        "phone": "+58412123456",
        "email": "juan@example.com",
    }
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    assert r.status_code == 201
    guest_id = r.json()["id"]

    # Agregar dispositivo
    device_data = {
        "mac": "AA:BB:CC:DD:EE:FF",
        "name": "iPhone 14",
        "vendor": "Apple",
    }
    r = client.post(
        f"/api/v1/guests/{guest_id}/devices", json=device_data, headers=auth_headers
    )
    assert r.status_code == 201, r.text
    device = r.json()
    assert device["mac"] == "AA:BB:CC:DD:EE:FF"
    assert device["name"] == "iPhone 14"
    assert device["vendor"] == "Apple"
    assert device["allowed"] is True
    assert device["guest_id"] == guest_id


def test_add_device_mac_uppercase(client, seed_admin, auth_headers):
    """Test que las direcciones MAC se convierten a mayúsculas."""
    # Crear huésped
    guest_data = {"full_name": "María López", "document_id": "V-87654321"}
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    guest_id = r.json()["id"]

    # Agregar dispositivo con MAC en minúsculas
    device_data = {"mac": "11:22:33:44:55:66", "name": "Android Phone"}
    r = client.post(
        f"/api/v1/guests/{guest_id}/devices", json=device_data, headers=auth_headers
    )
    assert r.status_code == 201
    # Verificar que se guardó en mayúsculas
    device = r.json()
    assert device["mac"] == "11:22:33:44:55:66"


def test_add_duplicate_mac_fails(client, seed_admin, auth_headers):
    """Test que no se puede registrar la misma MAC dos veces."""
    # Crear dos huéspedes
    guest1_data = {"full_name": "Guest 1", "document_id": "V-111111"}
    r = client.post("/api/v1/guests/", json=guest1_data, headers=auth_headers)
    guest1_id = r.json()["id"]

    guest2_data = {"full_name": "Guest 2", "document_id": "V-222222"}
    r = client.post("/api/v1/guests/", json=guest2_data, headers=auth_headers)
    guest2_id = r.json()["id"]

    # Agregar dispositivo al primer huésped
    device_data = {"mac": "AA:11:BB:22:CC:33", "name": "Device 1"}
    r = client.post(
        f"/api/v1/guests/{guest1_id}/devices", json=device_data, headers=auth_headers
    )
    assert r.status_code == 201

    # Intentar agregar la misma MAC al segundo huésped
    r = client.post(
        f"/api/v1/guests/{guest2_id}/devices", json=device_data, headers=auth_headers
    )
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


def test_list_guest_devices(client, seed_admin, auth_headers):
    """Test listar todos los dispositivos de un huésped."""
    # Crear huésped
    guest_data = {"full_name": "Pedro Sánchez", "document_id": "V-333333"}
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    guest_id = r.json()["id"]

    # Agregar múltiples dispositivos
    devices = [
        {"mac": "AA:AA:AA:AA:AA:01", "name": "Laptop"},
        {"mac": "BB:BB:BB:BB:BB:02", "name": "Phone"},
        {"mac": "CC:CC:CC:CC:CC:03", "name": "Tablet"},
    ]

    for dev_data in devices:
        r = client.post(
            f"/api/v1/guests/{guest_id}/devices", json=dev_data, headers=auth_headers
        )
        assert r.status_code == 201

    # Listar dispositivos
    r = client.get(f"/api/v1/guests/{guest_id}/devices", headers=auth_headers)
    assert r.status_code == 200
    devices_list = r.json()
    assert len(devices_list) == 3


def test_delete_device(client, seed_admin, auth_headers):
    """Test eliminar un dispositivo."""
    # Crear huésped y dispositivo
    guest_data = {"full_name": "Ana Torres", "document_id": "V-444444"}
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    guest_id = r.json()["id"]

    device_data = {"mac": "DD:DD:DD:DD:DD:DD", "name": "Old Phone"}
    r = client.post(
        f"/api/v1/guests/{guest_id}/devices", json=device_data, headers=auth_headers
    )
    device_id = r.json()["id"]

    # Eliminar dispositivo
    r = client.delete(
        f"/api/v1/guests/{guest_id}/devices/{device_id}", headers=auth_headers
    )
    assert r.status_code == 204

    # Verificar que se eliminó
    r = client.get(f"/api/v1/guests/{guest_id}/devices", headers=auth_headers)
    devices = r.json()
    assert len(devices) == 0


def test_add_device_to_nonexistent_guest_fails(client, seed_admin, auth_headers):
    """Test que falla al agregar dispositivo a huésped inexistente."""
    device_data = {"mac": "FF:FF:FF:FF:FF:FF", "name": "Test Device"}
    r = client.post("/api/v1/guests/99999/devices", json=device_data, headers=auth_headers)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_delete_nonexistent_device_fails(client, seed_admin, auth_headers):
    """Test que falla al eliminar dispositivo inexistente."""
    # Crear huésped
    guest_data = {"full_name": "Luis García", "document_id": "V-555555"}
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    guest_id = r.json()["id"]

    # Intentar eliminar dispositivo inexistente
    r = client.delete(f"/api/v1/guests/{guest_id}/devices/99999", headers=auth_headers)
    assert r.status_code == 404


def test_device_cascade_delete_with_guest(client, seed_admin, auth_headers):
    """Test que los dispositivos se eliminan cuando se elimina el huésped."""
    # Crear huésped
    guest_data = {"full_name": "Carlos Ruiz", "document_id": "V-666666"}
    r = client.post("/api/v1/guests/", json=guest_data, headers=auth_headers)
    guest_id = r.json()["id"]

    # Agregar dispositivo
    device_data = {"mac": "EE:EE:EE:EE:EE:EE", "name": "Test Device"}
    r = client.post(
        f"/api/v1/guests/{guest_id}/devices", json=device_data, headers=auth_headers
    )
    assert r.status_code == 201

    # Eliminar huésped (debe eliminar dispositivos en cascada)
    r = client.delete(f"/api/v1/guests/{guest_id}", headers=auth_headers)
    assert r.status_code == 204

    # Verificar que el huésped ya no existe
    r = client.get(f"/api/v1/guests/{guest_id}", headers=auth_headers)
    assert r.status_code == 404
