# Repository Guidelines

## Project Structure & Module Organization
`backend/app` hosts FastAPI modules (domains under `app/api`, `app/services`, and `app/models`), while migrations live in `backend/alembic`. Automated tests are in `backend/tests`, mirroring the API surface (`test_auth.py`, `test_rooms.py`, etc.). The React + Vite frontend resides in `frontend/src` with UI assets in `frontend/src/assets`. Shared scripts (`setup.sh`, `start_backend.sh`, `start_frontend.sh`, `create_test_data.sh`) sit at the repo root; run them from `/home/adrpinto/hostal` so relative paths resolve correctly.

## Build, Test, and Development Commands
`./setup.sh` provisions both stacks (installs Python deps, runs `npm install`, and seeds env files). Use `./start_backend.sh` for a hot-reload API server (internally `uvicorn app.main:app --reload --port 8000`) and `./start_frontend.sh` for Vite dev mode on port 3000. Database schema changes require `cd backend && alembic upgrade head`. Production-style builds rely on `cd frontend && npm run build && npm run preview` plus `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Coding Style & Naming Conventions
Python code follows Black and Ruff settings in `backend/pyproject.toml` (100-char lines, Python 3.11 target). Keep modules and functions snake_case, Pydantic models PascalCase, and dependency-injected callables declared at module top for autodiscovery. Run `cd backend && black app tests` and `ruff check app tests` before committing; `mypy app` guards type regressions. In the frontend, prefer PascalCase for components, camelCase for hooks/state, and Tailwind utility ordering that groups layout → color → state. TypeScript should pass `tsc --noEmit` (invoked automatically during `npm run build`).

## Testing Guidelines
Backend tests use pytest; execute `cd backend && pytest -q` and keep new suites under `backend/tests` named `test_<feature>.py`. Cover every new endpoint with both happy-path and auth/validation cases. Frontend verification currently relies on `npm run build` and manual flows documented in `README_TESTING.md`; when adding UI tests, colocate them under `frontend/src/__tests__`. Before submitting a PR, run the health check endpoint (`curl http://localhost:8000/api/v1/health`) and, if data changes, regenerate fixtures via `./create_test_data.sh`.

## Commit & Pull Request Guidelines
Commits follow a lightweight Conventional style observed in history (`feat:`, `fix:`, `docs:`, occasionally prefixed with emojis). Scope titles to 72 chars and describe intent, not implementation. Each PR should include: purpose, screenshots or CLI output for UI/API changes, referenced issue IDs, testing commands executed, and notes about migrations or env vars. Request reviews from both backend and frontend owners when changes cross stacks.

## Security & Configuration Tips
Never commit `.env` files; copy from `.env.example` and keep secrets in your shell or a `.env.local`. Default SQLite lives at `backend/hostal.db`; purge it before sharing fixtures. When exposing services, enable HTTPS termination and rotate the seed admin credentials (`admin@hostal.com / admin123`). Validate OAuth keys as outlined in `GOOGLE_OAUTH_SETUP.md` prior to pushing configuration tweaks.
