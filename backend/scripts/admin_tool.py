# backend/scripts/admin_tool.py
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# Ajusta el esquema si usas otro algoritmo
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Helpers de introspección ----------------------------------------------


def get_engine() -> Engine:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL no está definido en el entorno.", file=sys.stderr)
        sys.exit(1)
    return create_engine(db_url, future=True)


def get_user_columns(engine: Engine) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'users'
            """
            )
        ).fetchall()
    return {r[0] for r in rows}


def pick_first(cols: set[str], candidates: list[str]) -> Optional[str]:
    for c in candidates:
        if c in cols:
            return c
    return None


# --- Lógica principal -------------------------------------------------------


def upsert_admin(
    engine: Engine, email: str, password: Optional[str], role_value: str, activate: bool
) -> None:
    cols = get_user_columns(engine)

    # Detección flexible de nombres de columnas
    email_col = "email" if "email" in cols else None
    if not email_col:
        print("ERROR: No se encontró columna 'email' en la tabla users.", file=sys.stderr)
        sys.exit(2)

    id_col = "id" if "id" in cols else None
    pwd_col = pick_first(cols, ["hashed_password", "password_hash", "password"])
    role_col = pick_first(cols, ["role", "roles", "user_role"])
    active_col = pick_first(cols, ["is_active", "active", "enabled", "is_enabled", "status"])

    if not pwd_col:
        print(
            "ADVERTENCIA: No se encontró columna de contraseña (hashed_password/password_hash/password). "
            "Solo se podrá crear/actualizar el email/rol/activo si existen.",
            file=sys.stderr,
        )

    with engine.begin() as conn:
        # SELECT dinámico de existencia
        sel_cols = [email_col]
        if id_col:
            sel_cols.insert(0, id_col)
        if active_col:
            sel_cols.append(active_col)
        if role_col:
            sel_cols.append(role_col)

        select_sql = f"SELECT {', '.join(sel_cols)} FROM users WHERE {email_col} = :email"
        row = conn.execute(text(select_sql), {"email": email}).fetchone()

        # Construir SET/INSERT según columnas disponibles
        if row is None:
            if not pwd_col and password:
                print(
                    "ERROR: No hay columna de contraseña para crear usuario nuevo. "
                    "Crea el usuario con otra vía o añade la columna.",
                    file=sys.stderr,
                )
                sys.exit(3)

            insert_cols = [email_col]
            insert_vals = {"email": email}

            if pwd_col and password:
                insert_cols.append(pwd_col)
                insert_vals[pwd_col] = pwd_context.hash(password)

            if role_col:
                insert_cols.append(role_col)
                insert_vals[role_col] = role_value

            if active_col and activate:
                insert_cols.append(active_col)
                # Si 'status' es string, marcamos 'active'; si es bool, True
                if active_col == "status":
                    insert_vals[active_col] = "active"
                else:
                    insert_vals[active_col] = "true"

            sql = f"INSERT INTO users ({', '.join(insert_cols)}) VALUES ({', '.join(':'+c for c in insert_cols)})"
            conn.execute(text(sql), insert_vals)
            print(f"✅ Usuario creado: {email} (cols: {', '.join(insert_cols)})")

        else:
            sets = []
            params = {"email": email}

            if pwd_col and password:
                sets.append(f"{pwd_col} = :{pwd_col}")
                params[pwd_col] = pwd_context.hash(password)

            if role_col:
                sets.append(f"{role_col} = :{role_col}")
                params[role_col] = role_value

            if active_col and activate:
                if active_col == "status":
                    sets.append(f"{active_col} = :{active_col}")
                    params[active_col] = "active"
                else:
                    sets.append(f"{active_col} = true")

            if not sets:
                print(
                    "No hay cambios que aplicar (ni password, ni role, ni --activate, o columnas no disponibles)."
                )
                return

            sql = f"UPDATE users SET {', '.join(sets)} WHERE {email_col} = :email"
            conn.execute(text(sql), params)
            print(f"✅ Usuario actualizado: {email} (cambios: {', '.join(sets)})")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Crea/activa un admin y opcionalmente resetea su contraseña en la tabla users."
    )
    p.add_argument("--email", required=True, help="Email del usuario (ej: admin@hostal.com)")
    p.add_argument(
        "--password",
        help="Nueva contraseña. Obligatoria si el usuario no existe y quieres crearlo.",
    )
    p.add_argument("--role", default="admin", help="Rol a establecer (por defecto: admin)")
    p.add_argument(
        "--activate",
        action="store_true",
        help="Marca activo si existe una columna adecuada (is_active/active/enabled/status).",
    )
    return p.parse_args()


def main():
    args = parse_args()
    engine = get_engine()
    upsert_admin(engine, args.email, args.password, args.role, args.activate)


if __name__ == "__main__":
    main()
