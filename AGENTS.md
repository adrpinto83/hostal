# Repository Guidelines

## Project Structure & Module Organization
The repo is split between `backend/` (FastAPI + SQLite) and `frontend/` (React + Vite). Backend sources live in `backend/app/` across `core/`, `models/`, `routers/`, `schemas/`, and services powering backups, billing, and Mikrotik. `backend/alembic/` stores migrations, `backend/tests/` holds pytest suites, and `backend/scripts/` contains seeding helpers. Frontend code lives in `frontend/src/` (`components/`, `pages/`, `hooks/`, `lib/`, `types/`), with builds emitted to `frontend/dist/`. Use the root scripts (`setup.sh`, `start_backend.sh`, `start_frontend.sh`, `create_test_data.sh`) for local setup.

## Build, Test, and Development Commands
- Backend: `cd backend && make install && make run` installs dependencies and runs uvicorn with reload. Apply schema changes with `make migrate` and bootstrap users using `make admin email=... pass=...`.
- Frontend: `cd frontend && npm install && npm run dev` launches Vite (default port 5173; override via `-- --port 3000`). Use `npm run build && npm run preview` to check the production bundle.
- Full stack: run `./setup.sh` once, then the `start_*.sh` scripts plus `./create_test_data.sh` whenever you need a fresh dataset for invoices, backups, and Mikrotik devices.

## Coding Style & Naming Conventions
Python adheres to PEP8 (4 spaces, snake_case) with typed services and explicit router returns. Run `ruff check backend --fix`, `black backend`, and `mypy backend/app` before committing. React/TypeScript favors PascalCase components, camelCase utilities, and `useX` hooks. Keep shared helpers inside `src/lib`, reuse the currency formatter to avoid `undefined` or duplicate “Bs”, and lean on Tailwind utility classes.

## Testing Guidelines
- Backend: place pytest files under `backend/tests/test_<feature>.py` and run `cd backend && pytest`. Add `--cov=app --cov-report=term-missing` when altering billing, backup, or RouterOS flows.
- Frontend: colocate Vitest specs (`Component.test.tsx`) with their component, use utilities from `src/lib/test-utils`, and run `cd frontend && npx vitest run`. Always finish with `npm run build` to catch strict TypeScript errors.

## Commit & Pull Request Guidelines
Commits use conventional short prefixes (`feat: backup scheduler`) and mention schema changes, env vars, or RouterOS prerequisites. Pull requests should describe the motivation, include screenshots for UI updates, list commands executed (`pytest`, `npx vitest`, `create_test_data.sh`), and flag any data resets. Keep PRs focused so reviewers can validate backups, billing, and Mikrotik flows independently.

## Security & Configuration Tips
RouterOS automation pulls credentials from `NetworkDevice` rows marked `mikrotik`; verify IP, port, and API permissions before enabling automatic suspensions. Keep secrets in `.env` files ignored by Git. The backup scheduler writes to `backend/backups/backup_schedule.json`, so deployments must grant read/write access and document the path.
