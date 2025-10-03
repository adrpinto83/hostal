def test_login_and_me(client, seed_admin):
    r = client.post(
        "/auth/login", data={"username": "admin@hostal.com", "password": "MiClaveSegura"}
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r2 = client.get("/users/me", headers=headers)
    assert r2.status_code == 200, r2.text
    me = r2.json()
    assert me["email"] == "admin@hostal.com"
    assert me["role"] == "admin"
