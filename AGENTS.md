# Repository Guidelines

## Project Structure & Module Organization
The repository splits concerns into `backend/` (FastAPI) and `frontend/` (React + Vite). Backend code lives under `app/` with `core/` for config, `models/`, `routers/`, `schemas/`, and `services/`; database migrations live in `alembic/`, while `tests/` stores pytest suites and `scripts/` holds ops helpers. Frontend source is under `frontend/src/` with `components/`, `pages/`, `hooks/`, `lib/` for API clients, and `types/`; build assets output to `frontend/dist/`. Root-level scripts such as `setup.sh`, `start_backend.sh`, `start_frontend.sh`, and `create_test_data.sh` provide the quickest path to a working demo.

## Build, Test, and Development Commands
- Backend: `cd backend && make install && make run` installs dependencies and starts uvicorn with reload; `make migrate` applies Alembic migrations; `make admin email=... pass=...` bootstraps an account.
- Frontend: `cd frontend && npm install && npm run dev` launches Vite on port 5173 (override with `-- --port 3000`); `npm run build && npm run preview` produces and serves the production bundle.
- Full-stack helpers: from the repo root, run `./setup.sh` to provision both stacks, then `./start_backend.sh`, `./start_frontend.sh`, and `./create_test_data.sh` to populate demo data.

## Coding Style & Naming Conventions
Python modules follow PEP8 with 4-space indents and snake_case filenames; formatting is enforced with Black at 100 characters (`pyproject.toml`) and Ruff linters (`ruff check backend --fix`). Mypy runs on the `app` package, so keep types explicit on public functions and avoid dynamic attribute lookups when possible. React/TypeScript components use PascalCase filenames in `src/components` or `src/pages`, hooks start with `use`, and shared utilities sit under `src/lib` or `src/utils`. Tailwind CSS powers styling, so prefer utility classes over bespoke CSS and colocate component-specific tweaks near the JSX.

## Testing Guidelines
- Backend: tests live in `backend/tests/` and should be named `test_<feature>.py`; run `cd backend && pytest` for quick feedback or `pytest --cov=app --cov-report=html` to inspect coverage under `htmlcov/`.
- Frontend: colocate Vitest specs (`*.test.ts(x)`) next to the component, import the shared test utils from `src/lib/test-utils`, and run `cd frontend && npx vitest run` (add `--watch` for dev) until a dedicated npm script is added. Use `npm run build` before submitting to catch TypeScript errors that aren’t surfaced in dev mode.

## Commit & Pull Request Guidelines
Git history favors concise, conventional prefixes (`feat:`, `fix:`, `docs:`) plus a short summary (e.g., `fix: use dashboard stats for room availability`). Reference issue IDs in the description, list any new env vars, migrations, or scripts, and include screenshots/GIFs for UI-facing work. Pull requests should describe testing performed (`pytest`, `npx vitest run`, manual smoke across dashboards) and call out any data resets required. Keep diffs focused; split unrelated backend/frontend changes into separate PRs when practical.
