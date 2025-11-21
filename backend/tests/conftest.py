# conftest.py
from __future__ import annotations

import binascii
import hashlib
import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import User

# Usaremos SQLite en memoria para tests
TEST_DATABASE_URL = "sqlite+pysqlite:///:memory:"


@pytest.fixture
def auth_headers(client, seed_admin):
    """
    Devuelve headers Authorization Bearer para el admin sembrado.
    La contraseña en los tests es 'MiClaveSegura'.
    """
    r = client.post(
        "/auth/login", data={"username": "admin@hostal.com", "password": "MiClaveSegura"}
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(engine) -> Generator:
    # Transacción por test, rollback al final
    connection = engine.connect()
    trans = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    db = SessionLocal()
    try:
        # Limpia tablas entre tests si lo necesitas (aquí basta rollback)
        yield db
    finally:
        db.close()
        trans.rollback()
        connection.close()


def _hash_password(plain: str) -> str:
    # Reusa el esquema de hash del proyecto (ajústalo si difiere)
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, 390000)
    return f"pbkdf2_sha256$390000${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"


@pytest.fixture(scope="function")
def seed_admin(db_session):
    # Crea un admin de pruebas
    admin = User(
        email="admin@hostal.com",
        role="admin",
        hashed_password=hash_password("MiClaveSegura"),
        approved=True,
    )
    db_session.add(admin)
    db_session.commit()
    return admin


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    # Override de get_db para usar la sesión de test
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
