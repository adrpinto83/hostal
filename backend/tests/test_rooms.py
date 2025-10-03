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
    Verifies that a user with the default 'user' role cannot create rooms.
    """
    # 1. Setup: Create a user with 'user' role
    test_user = User(
        email="testuser@example.com",
        hashed_password=hash_password("password123"),
        role="user",  # Disallowed role
    )
    db_session.add(test_user)
    db_session.commit()

    # 2. Get token for this user
    login_resp = client.post(
        "/auth/login", data={"username": "testuser@example.com", "password": "password123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 3. Action: Attempt to create a room with the unauthorized user
    room_in = {"number": "FORBIDDEN-101", "type": "single"}
    r = client.post("/rooms/", json=room_in, headers=user_headers)

    # 4. Verification: The API should return a 403 Forbidden error
    assert r.status_code == 403, f"Expected 403, but got {r.status_code}. Response: {r.text}"

    response_json = r.json()

    # The "detail" key is standard for FastAPI dependency errors.
    assert (
        "detail" in response_json
    ), f"Response does not contain 'detail' key. Response: {response_json}"
    assert "Operation not permitted" in response_json["detail"]
