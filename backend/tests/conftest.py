# tests/conftest.py
import pytest
from httpx import Client

BASE_URL = "http://localhost:8000"


@pytest.fixture(scope="session")
def client():
    return Client(base_url=BASE_URL)


@pytest.fixture(scope="session")
def admin_token(client: Client):
    # asumimos bootstrap hecho
    resp = client.post(
        "/auth/login", json={"email": "admin@hostal.com", "password": "MiClaveSegura"}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture()
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
