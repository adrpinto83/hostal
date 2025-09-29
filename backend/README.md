
# Hostal System Backend (FastAPI + PostgreSQL)

## Quickstart (WSL2 + VS Code + Docker)
1) Copy `.env.example` to `.env` and customize passwords.
2) `docker compose up -d`  # starts Postgres + pgAdmin
3) (First time) create and activate a virtual env:
   ```bash
   python3 -m venv .venv && source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4) Run DB migrations:
   ```bash
   alembic upgrade head
   ```
5) Start API (dev):
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
6) Open docs: http://localhost:8000/docs

## Make a new migration after editing models
```bash
alembic revision -m "your message" --autogenerate
alembic upgrade head
```
