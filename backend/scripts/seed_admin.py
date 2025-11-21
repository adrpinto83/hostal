# scripts/seed_admin.py
import os

from passlib.context import CryptContext
from sqlalchemy import create_engine, text

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
admin_email = os.getenv("ADMIN_EMAIL", "admin@hostal.com")
admin_pass = os.getenv("ADMIN_PASS", "MiClaveSegura")

engine = create_engine(os.getenv("DATABASE_URL"))
h = pwd.hash(admin_pass)
with engine.begin() as conn:
    conn.execute(
        text(
            """
        INSERT INTO users (email, hashed_password, role, approved)
        VALUES (:email, :hash, 'admin', TRUE)
        ON CONFLICT (email) DO UPDATE
          SET hashed_password = EXCLUDED.hashed_password,
              role = 'admin',
              approved = TRUE;
    """
        ),
        {"email": admin_email, "hash": h},
    )
print("Admin listo:", admin_email)
