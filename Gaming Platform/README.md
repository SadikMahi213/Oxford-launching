# Gaming Platform

Production-grade online gaming platform built with Laravel 12 (backend API) and Next.js (frontend).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Laravel 12, PHP 8.4 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Auth | Laravel Sanctum (bearer tokens) |
| Permissions | spatie/laravel-permission |
| Frontend | Next.js 15, React 19, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Containerization | Docker, Docker Compose |
| Testing | Pest (backend), Playwright (frontend, planned) |

## Project Structure

```
Gaming Platform/
├── backend/           Laravel 12 API + Filament admin
│   ├── app/
│   │   ├── Domains/       DDD-style modules (wallet, game, payment)
│   │   ├── Http/          Controllers, Middleware, Resources, Requests
│   │   ├── Models/        Eloquent models
│   │   ├── Repositories/  Data-access abstractions
│   │   └── Services/      Business logic
│   ├── database/      Migrations, seeders, factories
│   ├── routes/        api.php, web.php
│   ├── tests/         Pest feature/unit tests
│   └── docker/        Dockerfile, nginx.conf
├── frontend/          Next.js App Router
│   ├── app/           Routes, layouts, pages
│   ├── components/    React components (shadcn/ui)
│   ├── lib/           API client, auth helpers, utilities
│   └── middleware.ts  Route protection
├── infra/             Docker Compose, nginx config
└── docs/              Architecture audit
```

## Prerequisites

- PHP 8.4+ with extensions: pdo_pgsql, redis, bcmath, intl, zip, opcache
- Composer 2
- Node.js 22+ with npm
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (optional, for containerized development)

## Quick Start (Local)

### 1. Backend

```bash
cd backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Create the database (PostgreSQL)
createdb gaming_platform

# Run migrations and seed
php artisan migrate --seed

# Start the development server
php artisan serve
```

The API will be available at `http://localhost:8000/api/v1`.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 3. Docker (Alternative)

```bash
# From the project root
docker compose -f infra/docker-compose.yml up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Backend API on `localhost:8080` (via nginx)
- Frontend on `localhost:3000`

## Environment Variables

### Backend (`.env`)

Key variables (copy from `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_CONNECTION` | Database driver | `pgsql` |
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port | `5432` |
| `DB_DATABASE` | Database name | `gaming_platform` |
| `DB_USERNAME` | Database user | `gaming` |
| `DB_PASSWORD` | Database password | *(required)* |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `SANCTUM_STATEFUL_DOMAINS` | Frontend domains for SPA auth | `localhost:3000` |

### Frontend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api/v1` |

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register a new player |
| POST | `/api/v1/auth/login` | No | Login and receive a token |
| POST | `/api/v1/auth/logout` | Yes | Revoke the current token |
| GET | `/api/v1/auth/me` | Yes | Get the authenticated user |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/ping` | No | API health check |
| GET | `/up` | No | Laravel health check |

### Response Format

All API responses follow this envelope:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "errors": null,
  "meta": null
}
```

## Testing

### Backend (Pest)

```bash
cd backend

# Run all tests
php artisan test

# Run only Pest tests
./vendor/bin/pest

# Run a specific test file
./vendor/bin/pest tests/Feature/AuthTest.php
```

### Frontend Type Checking

```bash
cd frontend
npm run typecheck
```

### Frontend Build

```bash
cd frontend
npm run build
```

## Architecture

See `docs/ARCHITECTURE_AUDIT.md` for the full architecture audit and design decisions.

### Key Principles

- **API-first:** Frontend is a thin client; all business logic lives in the backend.
- **Integer money:** All monetary values stored as BIGINT in minor units (cents).
- **Immutability:** Ledger tables (`wallet_transactions`) are append-only.
- **Module boundaries:** Cross-module calls go through domain services, never direct model coupling.
- **Webhook security:** Provider callbacks authenticated by HMAC signature, not user tokens.

## Development Workflow

1. Backend changes: run `php artisan test` to verify
2. Frontend changes: run `npm run typecheck` and `npm run build` to verify
3. Database changes: create a migration with `php artisan make:migration`
4. New API endpoints: add to `routes/api.php`, create controller in `app/Http/Controllers/Api/V1/`
5. New form validation: create a FormRequest in `app/Http/Requests/Api/V1/`
6. New business logic: create a Service in `app/Services/`

## Security

- Never commit `.env` files or secrets
- Use `REPLACE_ME` placeholders in `.env.example`
- Sanctum tokens are short-lived; rotate regularly
- Provider webhooks must verify HMAC signatures
- Admin panel uses a separate auth guard with 2FA (planned)
