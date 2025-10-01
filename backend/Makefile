# ====== Hostal Backend Makefile ======
SHELL := /bin/bash
VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
UVICORN := $(PY) -m uvicorn
APP := app.main:app

.PHONY: help test test-verbose ci venv activate install freeze clean \
	up down logs ps psql migrate revision downgrade run run-no-reload \
	admin login

help:
	@echo "Comandos disponibles:"
	@echo "  make venv         - crear virtualenv"
	@echo "  make install      - instalar dependencias"
	@echo "  make up           - levantar DB y pgAdmin (docker compose up -d)"
	@echo "  make migrate      - alembic upgrade head"
	@echo "  make run          - correr uvicorn (con --reload)"
	@echo "  make admin email=... pass=...  - crear admin"
	@echo "  make test         - ejecutar tests"

test:
	$(PY) -m pytest -q

test-verbose:
	$(PY) -m pytest -vv

ci:
	pre-commit run -a && make test

# -------- Entorno --------
venv:
	@test -d $(VENV) || python3 -m venv $(VENV)
	@echo "✅ venv listo en $(VENV)"

activate:
	@echo "Para activar: source $(VENV)/bin/activate"

install: venv
	$(PIP) install --upgrade pip setuptools wheel
	$(PIP) install -r requirements.txt
	@echo "✅ dependencias instaladas"

freeze:
	$(PIP) freeze > requirements.lock.txt

clean:
	rm -rf __pycache__ **/__pycache__ .pytest_cache .mypy_cache .ruff_cache
	find . -name '*.pyc' -delete
	@echo "Limpieza completada (no se borra $(VENV) por defecto)."

# -------- Base de Datos (Docker) --------
up:
	docker compose up -d
	@echo "✅ DB y pgAdmin arriba"

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

psql:
	@docker exec -it $$(docker ps -qf "name=db") psql -U $${POSTGRES_USER:-hostal} -d $${POSTGRES_DB:-hostal_db}

# -------- Alembic --------
migrate:
	$(PY) -m alembic upgrade head

downgrade:
	@if [ -z "$(rev)" ]; then echo "Uso: make downgrade rev=-1 (o revision id)"; exit 1; fi
	$(PY) -m alembic downgrade $(rev)

revision:
	@if [ -z "$(m)" ]; then echo 'Uso: make revision m="mensaje"'; exit 1; fi
	$(PY) -m alembic revision -m "$(m)" --autogenerate

# -------- Run API --------
run:
	$(UVICORN) $(APP) --reload --host 0.0.0.0 --port 8000

run-no-reload:
	$(UVICORN) $(APP) --host 0.0.0.0 --port 8000

# -------- Bootstrap Admin --------
admin:
	@if [ -z "$(email)" ] || [ -z "$(pass)" ]; then echo 'Uso: make admin email=usuario@dominio pass="ClaveSegura"'; exit 1; fi
	@echo "Creando admin $(email)..."
	curl -s -X POST http://localhost:8000/users/bootstrap \
	 -H "Content-Type: application/json" \
	 -d '{"email":"$(email)","password":"$(pass)","role":"admin"}' | jq .

login:
	@if [ -z "$(email)" ] || [ -z "$(pass)" ]; then echo 'Uso: make login email=usuario@dominio pass="Clave"'; exit 1; fi
	curl -s -X POST http://localhost:8000/auth/login \
	 -H "Content-Type: application/json" \
	 -d '{"email":"$(email)","password":"$(pass)"}' | jq .
