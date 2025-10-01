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
