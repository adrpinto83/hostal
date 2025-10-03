from app.core.security import hash_password
from app.models.user import User


def test_rooms_crud(client, auth_headers):
    # create
    r = client.post(
        "/rooms/", json={"number": "TEST-101", "type": "single", "notes": "x"}, headers=auth_headers
    )
    assert r.status_code == 201
    rid = r.json()["id"]

    # get
    r = client.get(f"/rooms/{rid}", headers=auth_headers)
    assert r.status_code == 200

    # list
    r = client.get("/rooms/", params={"q": "TEST-101"}, headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # patch
    r = client.patch(f"/rooms/{rid}", json={"notes": "updated"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["notes"] == "updated"

    # delete
    r = client.delete(f"/rooms/{rid}", headers=auth_headers)
    assert r.status_code == 204


def test_rooms_forbidden_for_default_user(client, db_session):
    """
    Verifica que un usuario con rol 'user' (por defecto) no puede crear habitaciones.
    """
    # 1. Setup: Crear un usuario con rol 'user'
    test_user = User(
        email="testuser@example.com",
        hashed_password=hash_password("password123"),
        role="user",  # Rol no permitido
    )
    db_session.add(test_user)
    db_session.commit()

    # 2. Obtener el token para este usuario
    login_resp = client.post(
        "/auth/login", data={"username": "testuser@example.com", "password": "password123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 3. Acción: Intentar crear una habitación con el usuario no autorizado
    room_in = {"number": "FORBIDDEN-101", "type": "single"}
    r = client.post("/rooms/", json=room_in, headers=user_headers)

    # 4. Verificación: La API debe devolver un error 403 Forbidden
    assert (
        r.status_code == 403
    ), f"Se esperaba 403, pero se obtuvo {r.status_code}. Respuesta: {r.text}"

    response_json = r.json()

    # --- LA CORRECCIÓN REAL Y DEFINITIVA ESTÁ AQUÍ ---
    # La API devuelve la clave "error", no "detail". Verificamos eso.
    assert (
        "error" in response_json
    ), f"La respuesta no contiene la clave 'error'. Respuesta: {response_json}"
    assert "Operation not permitted" in response_json["error"]
