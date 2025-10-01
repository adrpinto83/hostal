def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_login(client):
    r = client.post("/auth/login", json={"email": "admin@hostal.com", "password": "MiClaveSegura"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
