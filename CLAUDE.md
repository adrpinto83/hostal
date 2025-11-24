# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a complete hostel management system with authentication, reservations, multi-currency payments, Venezuelan invoicing, internet control, and more. The system is production-ready and designed for Venezuelan hospitality businesses.

**Tech Stack:**
- **Backend**: FastAPI 0.115+, SQLAlchemy 2.0, Alembic, Python 3.12+
- **Frontend**: React 18, TypeScript, Vite 5, TanStack Query v5, Tailwind CSS
- **Database**: SQLite (development), PostgreSQL (production)

## Common Commands

### Backend Development

```bash
# Navigate to backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Check current migration
alembic current

# Start development server (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Create test data
./create_test_data.sh
```

### Frontend Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Full Stack Development

```bash
# Start both backend and frontend (from project root)
./start-dev.sh

# Alternative: Use separate terminals
./start_backend.sh  # Terminal 1
./start_frontend.sh # Terminal 2
```

## Architecture & Key Concepts

### Backend Architecture

**Core Structure (`backend/app/`):**
- `core/` - Configuration, security, database session, logging, middleware, rate limiting, scheduler
- `models/` - SQLAlchemy ORM models (18 models including User, Guest, Room, Reservation, Payment, Invoice, etc.)
- `routers/` - FastAPI route handlers (21+ routers organized by domain)
- `schemas/` - Pydantic models for request/response validation
- `services/` - Business logic layer (separated from route handlers)

**Important Technical Details:**

1. **Database Migrations**: Use Alembic. The backend uses `alembic/` for all schema changes. Always create a migration for model changes rather than modifying the database directly.

2. **Authentication**: JWT-based authentication with role-based access control (RBAC). Roles: admin, gerente (manager), recepcionista (receptionist), mantenimiento (maintenance), staff.

3. **API Structure**: All endpoints are under `/api/v1` prefix. The main router aggregation happens in `app/routers/api.py`.

4. **Rate Limiting**: SlowAPI is configured for rate limiting. The limiter is in `app/core/limiter.py` and applied via middleware.

5. **Audit Logging**: All significant actions are logged in `audit_logs` table. Use the audit context from `app/core/audit.py`.

6. **Background Tasks**: APScheduler runs periodic tasks (backups, exchange rate updates). Configured in `app/core/scheduler.py`.

7. **File Uploads**: Handled in `app/routers/media.py`. Files are stored in `backend/uploads/` and served via `/media` route.

8. **Environment Config**: All configuration is in `app/core/config.py` using Pydantic Settings. Never hardcode configuration values.

### Frontend Architecture

**Core Structure (`frontend/src/`):**
- `pages/` - Top-level page components (18 page modules)
- `components/` - Reusable UI components organized by domain (ui/, guests/, rooms/, reservations/, invoices/, payments/, layout/)
- `lib/api/` - API client functions organized by domain
- `lib/hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `lib/utils.ts` - Utility functions (includes `cn` for class name merging)

**Important Frontend Patterns:**

1. **State Management**:
   - Server state: TanStack Query (React Query v5)
   - Global UI state: Zustand (lightweight, used sparingly)
   - Form state: React Hook Form (not currently used extensively, but available)

2. **API Integration**: API clients are in `lib/api/`. Each module exports typed functions. Base client is in `lib/api/client.ts` with Axios.

3. **Routing**: React Router v6 is used. Main routing config is in `App.tsx`.

4. **Authentication**: Auth context and hooks in `lib/hooks/useAuth.ts`. Protected routes use role-based checks from `lib/roles-permissions.ts`.

5. **UI Components**: Using Radix UI primitives (Alert Dialog, Dropdown Menu, Tooltip) with custom styling via Tailwind. Base UI components are in `components/ui/`.

6. **Notifications**: Sonner library for toast notifications.

7. **Venezuelan Payment Integration**: Special handling for Venezuelan Pago Móvil with bank codes, phone validation, and cédula validation. See `lib/venezuela-payments.ts`.

### Key Business Logic

**Multi-Currency Payments:**
- Supported currencies: USD, EUR, VES (Venezuelan Bolívares)
- Payment methods: Cash (requires bill code for USD/EUR), Venezuelan Pago Móvil (validates phone, cédula, bank), bank transfer, debit/credit card, Zelle, cryptocurrency
- 30 Venezuelan banks integrated
- Currency conversion with exchange rates (stored in `exchange_rate_snapshots`)
- Payment endpoints: `/api/v1/payments` (legacy) and `/api/v1/payments-v2` (Venezuelan Pago Móvil)

**Venezuelan Invoicing:**
- Complies with SENIAT regulations
- Invoice statuses: borrador (draft), emitida (issued), cancelada (canceled), pagada (paid)
- Line items with IVA (VAT) calculation
- Automatic invoice numbering
- PDF generation and email delivery capability

**Internet Control:**
- Manages network devices per guest
- Suspend/resume internet by device or guest
- Bandwidth monitoring
- MAC address blocking
- Integration with routers (MikroTik/Ubiquiti mentioned but implementation may be placeholder)

**Room Management:**
- Room statuses: Disponible (Available), Ocupada (Occupied), Limpieza (Cleaning), Mantenimiento (Maintenance)
- Dynamic room rates
- Real-time statistics

## Important Constraints & Patterns

### Backend

1. **Never bypass authentication**: Use the `get_current_user` and `require_role` dependencies from `app/core/security.py`.

2. **Database sessions**: Always use the `get_db` dependency for route handlers. Never create `SessionLocal()` directly in routes.

3. **Error handling**: Use appropriate HTTP exceptions (`HTTPException` from FastAPI). Follow RESTful status codes.

4. **Logging**: Use `structlog` for structured logging. Example:
   ```python
   import structlog
   log = structlog.get_logger()
   log.info("action_performed", user_id=user.id, details="...")
   ```

5. **Async/Await**: SQLAlchemy 2.0 supports async but this project uses sync operations. Don't mix async DB operations.

6. **Schema Validation**: All request/response models should be Pydantic schemas in `app/schemas/`. Never return ORM models directly.

7. **CORS Configuration**: Set via `CORS_ORIGINS` environment variable. For production, specify exact domains.

### Frontend

1. **API Error Handling**: Always handle errors from API calls and show user-friendly messages via toast notifications.

2. **TypeScript**: Use proper typing. Avoid `any` types. Define interfaces in `types/` directory.

3. **Component Organization**: Keep components small and focused. Separate presentational components from containers.

4. **Tailwind CSS**: Use utility classes. Use `cn()` utility from `lib/utils.ts` for conditional class names.

5. **React Query**: Use query keys consistently. Invalidate queries after mutations to refresh data.

6. **Form Validation**: Forms should validate inputs. See examples in `components/guests/`, `components/rooms/`, and `components/reservations/`.

## Testing

### Backend Tests

Test files are in `backend/tests/`. Current test coverage includes:
- `test_auth.py` - Authentication flows
- `test_devices.py` - Device management
- `test_health.py` - Health check endpoint
- `test_reservations.py` - Reservation CRUD
- `test_room_rates.py` - Room rate management
- `test_rooms.py` - Room CRUD
- `test_flow_basic.py` - Basic workflows

Use `conftest.py` for test fixtures and database setup.

### Running Specific Tests

```bash
# Run single test file
pytest tests/test_rooms.py -v

# Run single test function
pytest tests/test_rooms.py::test_create_room -v

# Run with debug output
pytest tests/test_rooms.py -v -s
```

## Database Migrations

**Creating a new migration:**
```bash
cd backend
source venv/bin/activate

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file in alembic/versions/
# Edit if necessary, then apply:
alembic upgrade head
```

**Important**: Always review auto-generated migrations. Alembic may miss some changes or generate incorrect operations.

## Environment Variables

### Backend `.env` (Required)

```bash
APP_ENV=dev  # dev, staging, prod
DEBUG=True   # False in production
SECRET_KEY=change-me-in-production  # CRITICAL: Generate secure key for production
DATABASE_URL=sqlite:///./hostal.db  # Or postgresql://user:pass@host/db for production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
API_URL=http://localhost:8000
```

See `backend/.env.example` for complete reference.

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:8000
```

## Production Deployment

For production deployment:

1. **Backend**:
   - Set `APP_ENV=prod`
   - Use PostgreSQL instead of SQLite
   - Generate secure `SECRET_KEY` (min 32 chars)
   - Configure specific `CORS_ORIGINS` (no wildcards)
   - Set `DEBUG=False`
   - Configure email SMTP settings for invoice delivery
   - Enable HTTPS
   - Set up supervisor for process management
   - Configure Nginx as reverse proxy

2. **Frontend**:
   - Build with `npm run build`
   - Serve `dist/` directory with Nginx or similar
   - Set correct `VITE_API_URL` pointing to production API

See `DEPLOYMENT_GUIDE.md` for detailed production setup instructions.

## Key Files to Reference

- `README.md` - Comprehensive project documentation
- `QUICK_START.md` - Quick start guide
- `START_LOCAL.md` - Detailed local setup instructions
- `DEPLOYMENT_GUIDE.md` - Production deployment guide
- `backend/API_PAYMENT_ENDPOINTS_REFERENCE.md` - Payment API documentation
- `backend/SETUP_INSTRUCTIONS.md` - Backend setup and test data
- `frontend/FORM_GUIDE.md` - Form component patterns
- `frontend/BANDWIDTH_INTEGRATION.md` - Network bandwidth integration docs

## Default Credentials

For testing with generated data:
```
Email: admin@hostal.com
Password: admin123
```

## Notes on Stripe Integration

The codebase has Stripe integration endpoints (`/api/v1/payments-v2/stripe/*`) and webhooks, but the README indicates Stripe was removed in favor of local Venezuelan payment methods. The code remains but may not be actively used. Prioritize Venezuelan Pago Móvil payment flows when working on payment features.
