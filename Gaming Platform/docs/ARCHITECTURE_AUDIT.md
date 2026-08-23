# Architecture Audit — Production-Grade Online Gaming Platform

> **Document status:** Draft v1.0
> **Author:** Lead Software Architect
> **Date:** 2026-08-21
> **Repository:** `G:\Gaming Platform` (git root at `G:\`, remote `ahanafabid01/ArbiGrow`)

---

## 0. Executive Summary

The repository located at `G:\Gaming Platform` was inspected in its entirety. The findings are:

- The `G:\Gaming Platform` directory **contains no source code** (0 files, 0 directories).
- The git working tree root is `G:\` and the only configured remote is `https://github.com/ahanafabid01/ArbiGrow.git` — an **e-commerce** project, not a gaming platform.
- The git history contains commits for `ArbiGrow/src/component/EcommercePromo.jsx` and related e-commerce features. There is **no Next.js, Laravel, PostgreSQL, wallet, payment, game-provider, or admin code** present.

**Conclusion:** There is no existing gaming-platform system to audit, refactor, or extend. This is a **greenfield project**. The current repository is effectively a placeholder. The recommendation is to **build from scratch** following the target technology stack, using the architecture defined below as the blueprint. Nothing existing needs to be preserved or changed because nothing gaming-related exists.

> NOTE: Any e-commerce code referenced by the git history (ArbiGrow) is **out of scope** and should NOT be modified, deleted, or used as a basis for this platform. It lives outside the `Gaming Platform` directory and is unrelated.

---

## 1. Current Architecture

| Layer | Status | Notes |
|-------|--------|-------|
| Frontend | Not present | No Next.js / TypeScript app exists. |
| Backend API | Not present | No Laravel 12 / PHP 8.4 application exists. |
| Database | Not present | No PostgreSQL schema, migrations, or models. |
| Cache / Queue | Not present | No Redis usage. |
| Auth | Not present | No Laravel Sanctum setup. |
| Admin | Not present | No Filament panel. |
| Wallet / Ledger | Not present | No wallet, ledger, or transaction tables/code. |
| Game Provider | Not present | No provider integration code. |
| Payments | Not present | No payment gateway integration. |
| Tests | Not present | No Pest / PHPUnit / Playwright. |
| Infra | Not present | No Dockerfile / compose. |

**Current state diagram:**

```
G:\Gaming Platform\
└── (empty)   ← no code, no config, no scaffold
```

The surrounding `G:\` drive contains many unrelated projects (e-commerce, WordPress, Flutter, etc.) tracked under the same git root — these are **noise** and must not influence the gaming-platform design.

---

## 2. Target Architecture

A modular, API-first monorepo-style layout with **two deployable applications** sharing a single PostgreSQL database and Redis instance:

1. **`backend/`** — Laravel 12 (PHP 8.4) API + Filament admin (same app, separate route prefix).
2. **`frontend/`** — Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.

```
G:\Gaming Platform\
├── backend/                 # Laravel 12 API + Filament admin
│   ├── app/
│   │   ├── Domains/         # Wallet, Game, Payment, User (DDD-style modules)
│   │   ├── Http/            # Controllers, Middleware, Resources
│   │   ├── Providers/
│   │   └── Console/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/              # api.php, admin.php, web.php, channels.php
│   ├── tests/               # Pest feature/unit
│   ├── docker/              # Dockerfile, nginx, php-fpm
│   └── composer.json
├── frontend/                # Next.js 14+ App Router
│   ├── app/                 # routes, layouts
│   ├── components/ui/       # shadcn/ui
│   ├── lib/                 # API client, auth helpers
│   ├── e2e/                 # Playwright
│   └── package.json
├── infra/                   # docker-compose.yml, postgres, redis, nginx
├── docs/
│   └── ARCHITECTURE_AUDIT.md
└── README.md
```

**Key principle:** Backend owns all business logic (wallet math, provider callbacks, payment verification). Frontend is a thin, typed client consuming the API. Admin (Filament) reuses the same backend services.

---

## 3. Module Boundaries

| Module | Responsibility | Depends on | Must NOT touch |
|--------|----------------|------------|----------------|
| **User / Auth** | Registration, login, Sanctum tokens, KYC status | Wallet (create on signup) | Game provider secrets |
| **Wallet** | Balance, debit/credit, holds, ledger entries | Transaction, User | Payment gateway internals |
| **Transaction** | Immutable ledger of every balance change | Wallet, Payment, Game | Frontend rendering |
| **Payment** | Deposit/withdraw via gateways (Stripe, crypto, etc.) | Wallet, Transaction | Game logic |
| **Game Provider** | Integrate 3rd-party game APIs, launch/round/callback | Wallet, Transaction | Admin UI code |
| **Admin (Filament)** | Operators manage users, games, payouts, reports | All domains (read/write) | Public API routes |
| **Frontend** | Player UI, lobby, wallet view, cashier | Backend API only | Direct DB access |

**Rule:** Cross-module calls go through **domain services / interfaces**, never via direct model coupling. Example: `GameProviderService` calls `WalletService::credit()` — it never writes to `wallets` table directly.

---

## 4. Database Overview (PostgreSQL)

Proposed core tables (no migrations exist yet — these are the target schema):

| Table | Purpose |
|-------|---------|
| `users` | Player accounts, KYC, status |
| `personal_access_tokens` | Sanctum (Laravel built-in) |
| `wallets` | One row per user, `balance`, `currency`, `locked_balance` |
| `wallet_transactions` | Append-only ledger (double-entry style) |
| `transactions` | Business txns: deposit, withdraw, bet, win, refund |
| `payment_methods` | Gateway configs per provider |
| `payments` | Deposit/withdraw requests + status |
| `game_providers` | Provider registry (Pragmatic, Evolution, etc.) |
| `games` | Catalog of launchable games |
| `game_sessions` | Active play sessions / rounds |
| `game_rounds` | Per-round bet/win records |
| `admin_users` | Filament admins (separate from players) |
| `audit_logs` | Admin/security actions |

**Conventions:**
- All monetary columns: `BIGINT` stored in **minor units** (cents) to avoid float errors.
- `wallet_transactions` is immutable (no UPDATE/DELETE in app code).
- Use PostgreSQL `SERIALIZABLE` or explicit row locks (`->lockForUpdate()`) for balance changes.

---

## 5. API Architecture

- **Style:** REST + JSON, versioned (`/api/v1/...`).
- **Auth:** Laravel Sanctum bearer tokens on `auth:sanctum` middleware.
- **Route groups:**
  - `api.php` → `App\Http\Controllers\Api\*` (player-facing, token-protected).
  - `admin.php` → Filament routes (session-based, `/admin`).
  - `web.php` → minimal (health check, provider callback webhooks — verify signature, not token).
- **Provider callbacks:** Game/payment providers POST to `/webhooks/{provider}` — authenticated by **HMAC signature**, not user token.
- **Validation:** Form Requests for every endpoint.
- **Responses:** API Resources (never raw model `toArray`).
- **Rate limiting:** `throttle` middleware on auth + cashier endpoints; stricter on wallet ops.

---

## 6. Authentication Architecture

- **Players:** Laravel Sanctum (token-based, stateless). Mobile/web share the same token guard.
- **Admins:** Filament uses session-based auth with a separate `admin_users` guard (`filament` guard).
- **Passwords:** `bcrypt`/`argon2`; never store plaintext.
- **Tokens:** Short-lived access tokens; optional refresh strategy.
- **KYC:** `users.kyc_status` gates withdrawals and high-value deposits.
- **Session/cookie security:** `Secure`, `HttpOnly`, `SameSite=Lax` in production.

---

## 7. Wallet Architecture

- **Single source of truth:** `wallets.balance` (minor units).
- **Operations:**
  - `credit(amount, reason, ref)` → +balance, append ledger entry.
  - `debit(amount, reason, ref)` → check sufficient balance, −balance, append ledger entry. Lock row.
  - `hold(amount)` / `release(amount)` → for in-game bets (reserve funds during a round).
- **Ledger:** Every mutation writes an immutable `wallet_transactions` row (double-entry: debit one side, credit another, or external).
- **Concurrency:** All balance ops wrapped in DB transaction + `lockForUpdate()` on the wallet row.
- **Invariant:** `SUM(wallet_transactions delta) == wallets.balance` (enforced by tests + periodic reconciliation job).

---

## 8. Transaction Architecture

- `transactions` = business-level events (deposit, withdrawal, bet, payout, bonus, refund).
- `wallet_transactions` = the immutable money ledger (the audit trail).
- **Flow example (deposit):**
  1. Payment gateway webhook → verify HMAC → create `payments` (status `pending`).
  2. On success → `WalletService::credit` → `wallet_transactions` + `transactions` rows.
  3. Emit event for admin/reporting.
- **Idempotency:** Provider callbacks keyed by `gateway_txn_id` to prevent double-credit.

---

## 9. Game-Provider Architecture

- **Integration pattern:** Adapter per provider implementing a common `GameProviderInterface`:
  - `launchGame(gameId, user)` → SSO launch URL.
  - `handleCallback(payload)` → verify signature, apply bet/win to wallet.
  - `getBalance(user)` → for providers that poll.
- **Registry:** `game_providers` table holds config (api_key, secret, endpoint).
- **Bet flow:**
  1. Player launches game → provider opens session.
  2. Provider calls back on bet/win → `GameProviderService` validates HMAC → `WalletService::hold/release/credit/debit`.
  3. All round data stored in `game_rounds` for reconciliation.
- **Security:** Each provider gets its own webhook route + secret; failed signature → 401, logged.

---

## 10. Admin Architecture (Filament)

- Filament 3 panel mounted at `/admin`, guarded by `filament` auth (separate `admin_users`).
- **Resources:** UserResource, WalletResource (read-only + adjust with audit), GameResource, GameProviderResource, PaymentResource, TransactionResource, ReportResource.
- **Policies:** Gate every resource by admin role/permission (spatie/laravel-permission recommended).
- **Audit:** All admin mutations logged to `audit_logs`.
- **No public exposure:** Admin routes are IP-restricted / 2FA in production.

---

## 11. Frontend Architecture (Next.js)

- **Framework:** Next.js 14+ App Router, TypeScript strict.
- **UI:** Tailwind CSS + shadcn/ui (Radix-based components).
- **State:** Server Components by default; client components only for interactivity.
- **Data fetching:** Typed API client in `lib/api` using fetch + Sanctum token from cookies/localStorage.
- **Auth:** Token stored securely; middleware protects `/dashboard` routes.
- **Pages:** Home/lobby, Game view (iframe launcher), Wallet/Cashier, Profile/KYC, Transactions history.
- **i18n:** Optional (next-intl) if multi-language required later.
- **Tests:** Playwright e2e in `frontend/e2e` (login, deposit flow, game launch, logout).

---

## 12. Security Architecture

| Concern | Mitigation |
|---------|------------|
| Auth token theft | Sanctum short-lived tokens, HTTPS only, `Secure`/`HttpOnly` cookies |
| Provider spoofing | HMAC signature verification on every webhook |
| Double-spend | Row lock + DB transaction on wallet ops |
| SQL injection | Eloquent ORM, parameterized queries, no raw SQL in controllers |
| XSS | React auto-escaping, CSP header, no `dangerouslySetInnerHTML` |
| CSRF | Sanctum stateless (token) for API; Filament uses Laravel CSRF for session |
| Rate abuse | `throttle` on auth/cashier; captcha on registration |
| Secrets | `.env` never committed; Docker secrets in prod |
| Admin access | Separate guard, IP allowlist, 2FA, audit log |
| Money precision | Integer minor units, never floats |

---

## 13. Testing Strategy

- **Backend (Pest):**
  - Unit: WalletService debit/credit/hold math, idempotency.
  - Feature: API endpoints (auth, wallet, payments, game callbacks) with mocked providers.
  - Architecture tests: no cross-module violations, no direct DB writes outside services.
- **Frontend (Playwright):**
  - e2e: registration → login → deposit (mock gateway) → launch game → logout.
  - Component tests optional via Vitest.
- **Contract:** Provider webhook payloads validated against fixtures.
- **Coverage gate:** Wallet & Transaction modules require ≥90% coverage (money-critical).

---

## 14. Deployment Strategy (Docker)

`infra/docker-compose.yml`:
- `postgres:16` — primary DB (persistent volume).
- `redis:7` — cache + queue.
- `backend` — PHP 8.4-FPM + nginx, built from `backend/docker/Dockerfile`.
- `frontend` — Next.js standalone build, served via nginx.
- `worker` — `php artisan queue:work` for async payouts/reports.
- **Environments:** `.env.example` committed; real secrets via Docker/CI secrets.
- **Migrations:** Run `php artisan migrate --force` on deploy.
- **Zero-downtime:** Laravel migrations forward-only; avoid destructive changes in prod.

---

## 15. Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Money bugs (double credit) | Critical | Med | Row locks, idempotency keys, ledger reconciliation job |
| Provider HMAC mismatch | High | Med | Clear docs, fixtures, alerting on failed verify |
| Scope creep (build everything at once) | High | High | Phased rollout (see §16) |
| Confusing git root (G:\ contains unrelated projects) | Med | High | Keep `Gaming Platform` self-contained; ignore parent noise |
| Float precision errors | Critical | Med | Integer minor units everywhere |
| Admin privilege escalation | High | Low | Separate guard + spatie permissions + audit |

---

## 16. Recommended Implementation Order

**Phase 0 — Scaffold (no features):**
- Init `backend/` (Laravel 12, PHP 8.4) and `frontend/` (Next.js).
- Docker compose (postgres, redis, backend, frontend).
- CI skeleton.

**Phase 1 — Foundation:**
- Users + Sanctum auth (register/login/logout).
- Wallets + WalletService + ledger migration.
- Wallet unit/feature tests (the riskiest logic first).

**Phase 2 — Money movement:**
- Payments module (deposit) with one gateway + webhook.
- Transactions + reconciliation job.

**Phase 3 — Games:**
- GameProvider interface + one provider adapter.
- Launch flow + bet/win callbacks wired to wallet.

**Phase 4 — Admin:**
- Filament panel, resources, permissions, audit log.

**Phase 5 — Frontend polish + e2e:**
- Lobby, cashier, wallet UI, Playwright e2e.

**Phase 6 — Hardening:**
- Rate limits, 2FA, monitoring, load tests.

---

## 17. Dependency Map (Major Modules)

```
                 ┌─────────────┐
                 │  Frontend   │ (Next.js)
                 │  (player)   │
                 └──────┬──────┘
                        │ HTTPS / Sanctum token
                        ▼
        ┌───────────────────────────────────┐
        │           Laravel API             │
        │  ┌──────────┐   ┌──────────────┐  │
        │  │   Auth   │──▶│   Wallet     │  │
        │  └──────────┘   └──────┬───────┘  │
        │                        │          │
        │  ┌──────────┐   ┌──────▼───────┐  │
        │  │ Payment  │──▶│ Transaction  │  │
        │  └────┬─────┘   └──────────────┘  │
        │       │ HMAC webhook              │
        │  ┌────▼─────┐   ┌──────────────┐  │
        │  │ Provider │──▶│   Game       │  │
        │  └──────────┘   └──────────────┘  │
        └───────────────┬───────────────────┘
                        │ (shared services)
                        ▼
                 ┌─────────────┐
                 │   Filament  │ (Admin, separate guard)
                 └─────────────┘

   Shared infra: PostgreSQL (all tables) + Redis (cache/queue/sessions)
```

**Edges:**
- Frontend → API (token)
- Auth → Wallet (creates wallet on signup)
- Payment → Wallet + Transaction
- Game/Provider → Wallet + Transaction
- Admin → all domains (via same services)
- All modules → PostgreSQL + Redis

---

## 18. What Should NOT Be Changed

- **Nothing in the gaming platform repo needs preserving** — it is empty.
- **Do NOT touch** the surrounding `G:\` projects (ArbiGrow, WordPress, Flutter apps, etc.). They are unrelated, tracked under the same git root, and out of scope.
- **Do NOT** reuse ArbiGrow e-commerce code as a base — it is a different domain.
- **Do NOT** delete or rewrite any unrelated files elsewhere on `G:\`.

---

## 19. Extend vs. Refactor Decision

**Decision: BUILD FROM SCRATCH (greenfield).**

Rationale:
- No existing gaming-platform code exists in `G:\Gaming Platform`.
- The only git history present is for an unrelated e-commerce project.
- "Extend or partially refactor" is moot — there is nothing to extend. The correct action is a clean, modular implementation per the target stack, following the phased plan above.

---

## 20. Files Inspected

| Path | Result |
|------|--------|
| `G:\Gaming Platform\` | Empty (0 entries) |
| `G:\Gaming Platform\.git` | Does not exist (git root is `G:\`) |
| `G:\` (git root) | Contains unrelated projects; remote = `ahanafabid01/ArbiGrow` (e-commerce) |
| `git log` (HEAD) | Commits for `ArbiGrow/src/component/EcommercePromo.jsx` etc. — not gaming |
| `git status` | All `G:\` subdirs listed as untracked; no gaming-platform files |

No gaming-platform source files, configurations, migrations, or tests were found.

---

## 21. Architecture Findings

1. **Empty project** — `G:\Gaming Platform` has no code, config, or scaffold.
2. **Misleading git context** — git root is `G:\` and points to an e-commerce repo (ArbiGrow). This is noise, not the gaming platform.
3. **No technical debt to manage** — there is no existing wallet/payment/game/admin code to audit or fix.
4. **Clean slate** — we can enforce best practices (integer money, row locks, HMAC webhooks, DDD module boundaries) from day one.
5. **Risk: git hygiene** — building inside a git root that also tracks many unrelated folders is error-prone. Recommend a dedicated repo/clone for the gaming platform.

---

## 22. Recommended Next Phase

**Phase 0 + Phase 1 (Scaffold & Foundation).**
Set up the two applications and the money-critical core (auth + wallet) with tests before anything else. This de-risks the entire platform because every other module (payments, games, admin) depends on a trustworthy wallet.

---

## 23. Exact Files That Would Change in Phase 1

> No existing files will be modified (repo is empty). The following **new** files would be created in Phase 1:

**Backend (`backend/`):**
- `backend/composer.json`, `backend/phpunit.xml`, `backend/.env.example`
- `backend/app/Models/User.php`, `backend/app/Models/Wallet.php`, `backend/app/Models/WalletTransaction.php`
- `backend/app/Domains/Wallet/WalletService.php`
- `backend/app/Http/Controllers/Api/AuthController.php`
- `backend/app/Http/Requests/RegisterRequest.php`, `LoginRequest.php`
- `backend/app/Providers/AuthServiceProvider.php` (Sanctum)
- `backend/database/migrations/xxxx_create_users_table.php`
- `backend/database/migrations/xxxx_create_personal_access_tokens_table.php` (Sanctum)
- `backend/database/migrations/xxxx_create_wallets_table.php`
- `backend/database/migrations/xxxx_create_wallet_transactions_table.php`
- `backend/database/seeders/DatabaseSeeder.php`
- `backend/database/factories/UserFactory.php`, `WalletFactory.php`
- `backend/routes/api.php` (auth + wallet endpoints)
- `backend/tests/Unit/WalletServiceTest.php` (Pest)
- `backend/tests/Feature/AuthTest.php` (Pest)
- `backend/docker/Dockerfile`, `backend/docker/nginx.conf`

**Infra (`infra/`):**
- `infra/docker-compose.yml` (postgres, redis, backend)
- `infra/postgres/init.sql` (optional)

**Frontend (`frontend/`):**
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.js`
- `frontend/app/layout.tsx`, `frontend/app/page.tsx`
- `frontend/lib/api/client.ts` (typed Sanctum client)
- `frontend/app/(auth)/login/page.tsx`, `register/page.tsx`
- `frontend/components/ui/*` (shadcn/ui primitives)

**Root:**
- `README.md` (project setup)
- `docs/ARCHITECTURE_AUDIT.md` (this document)

---

*End of Architecture Audit v1.0*
