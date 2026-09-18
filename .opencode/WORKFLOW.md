# ArbiGrow Development Workflow

## Table of Contents

1. [Version Control](#1-version-control)
2. [Branch Strategy](#2-branch-strategy)
3. [Automatic Snapshots](#3-automatic-snapshots)
4. [Rollback System](#4-rollback-system)
5. [Module Isolation](#5-module-isolation)
6. [Dependency Analysis](#6-dependency-analysis)
7. [Impact Analysis](#7-impact-analysis)
8. [AI-Safe Editing](#8-ai-safe-editing)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Security](#11-security)

---

## 1. Version Control

### Repository
- Location: `G:\Oxforf\ArbiGrow`
- Remotes:
  - `origin` → `https://github.com/ahanafabid01/ArbiGrow.git` (primary)
  - `oxford` → `https://github.com/SadikMahi213/Oxford.git` (backup)

### Configuration
- Git user: `SadikMahi213` / `sadikmahi213@gmail.com`
- `.gitignore` at project root blocks secrets, env files, caches, OS files
- **Critical**: The old repo at `G:/.git` (entire G drive root) is now deprecated. All work uses `G:\Oxforf\ArbiGrow\.git`

### Commit Rules
- Every logical change = one commit
- Message format: `type(module): description`
- Never commit: `.env` files, credentials, tokens, `node_modules/`, `__pycache__/`
- Always snapshot before destructive changes

## 2. Branch Strategy

```
main (production)
  └── develop (integration)
       ├── feature/auth
       ├── feature/wallet
       ├── feature/kyc
       ├── feature/deposit
       ├── feature/withdraw
       ├── feature/mlm
       ├── feature/rank
       ├── feature/referral
       ├── feature/ecommerce
       ├── feature/products
       ├── feature/orders
       ├── feature/admin
       ├── feature/reports
       └── feature/settings
  └── hotfix/* (emergency fixes from main)
```

### Rules
- `main` — always deployable. Protected. No direct commits.
- `develop` — integration branch. Feature branches merge here first.
- `feature/*` — one branch per module. Never modify outside module scope.
- `hotfix/*` — branch from `main`, merge back to both `main` and `develop`.

### Setup Commands
```powershell
git checkout -b develop main
git push -u origin develop
```

## 3. Automatic Snapshots

### Before Every Change
```powershell
.opencode\workflow\snapshot.ps1 -Name "before-kyc-fix"
```

### What It Captures
| Artifact | Location | Restore Method |
|----------|----------|----------------|
| Source code | Git tag `snapshot/before-xxx` | `git checkout snapshot/before-xxx` |
| Migration state | `.opencode/snapshots/xxx/migration-list.txt` | Review for alembic downgrade |
| Environment files | `.opencode/snapshots/xxx/.env*` | Manual copy |
| Config files | `.opencode/snapshots/xxx/*.bak` | Auto-restored by rollback |
| Git status | `.opencode/snapshots/xxx/git-status.txt` | Reference only |
| DB schema (optional) | `.opencode/snapshots/xxx/schema.sql` | `psql -f schema.sql` |

### Snapshot Naming Convention
```
before-<brief-description>
```
Example: `before-kyc-fix`, `before-deposit-rate-change`, `before-mlm-rank-update`

## 4. Rollback System

### One-Command Rollback
```powershell
.opencode\workflow\rollback.ps1 -Target "snapshot/before-kyc-fix"
```

### What Happens
1. Creates a pre-rollback snapshot (so you can undo the undo)
2. Stashes uncommitted changes (if `-Stash` flag used)
3. Checks out the target git tag
4. Restores configuration files from snapshot
5. Prints migration downgrade instructions if needed

### Recovery Scenarios

| Scenario | Command |
|----------|---------|
| Undo last changes | `rollback.ps1 -Target "snapshot/before-xxx"` |
| Reset to production | `git checkout main` |
| Undo rollback | `rollback.ps1 -Target "snapshot/pre-rollback-<timestamp>"` |
| Recover deleted file | `git checkout <tag> -- <filepath>` |
| Restore DB schema | `psql -d <db> -f .opencode\snapshots\<name>\schema.sql` |

### Database Rollback
```powershell
cd ProductionBackup\backend
alembic downgrade -1          # Undo last migration
alembic downgrade <revision>  # Undo to specific revision
alembic history               # List all migrations
```

## 5. Module Isolation

### Module Map

| Module | Backend Files | Frontend Files | DB Tables |
|--------|--------------|----------------|-----------|
| **auth** | `api/v1/auth.py`, `core/security.py`, `models/user.py` | Login/Register pages | `users`, `refresh_tokens`, `token_blacklist` |
| **wallet** | `api/v1/user.py` (wallet fields) | Profile/Wallet page | `users.deposit_wallet`, `users.main_wallet`, `users.withdraw_wallet`, `wallet_transactions` |
| **kyc** | `api/v1/kyc.py`, `api/v1/admin.py` (kyc-status), `models/kyc.py`, `utils/kyc_helper.py` | KYC page, Admin KYC drawer | `kyc_verifications`, `kyc_packages`, `users.kyc_hold` |
| **deposit** | `api/v1/deposits.py`, `api/v1/deposit_network.py` | Deposit page | `deposits`, `deposit_networks` |
| **withdraw** | `api/v1/withdrawals.py`, `api/v1/withdrawal_method.py` | Withdraw page | `withdrawals`, `withdrawal_methods` |
| **mlm / rank** | `services/rank_service.py`, `api/v1/ranks.py`, `api/v1/admin_ranks.py` | Rank page | `ranks`, `rank_histories`, `rank_bonus_configs`, `matching_bonuses`, `users.current_rank_id` |
| **referral** | `services/referral_service.py` (if separate) | Referral page | `users.parent_lvl_1_id` through `parent_lvl_5_id` |
| **ecommerce** | `api/v1/ecommerce.py`, `api/v1/marketplace.py` | Marketplace, Product pages | `products`, `categories`, `orders`, `order_items`, `carts` |
| **admin** | `api/v1/admin*.py` | Admin dashboard, user mgmt | Multiple |
| **investment** | `api/v1/investments.py`, `services/investment_service.py` | Investment page | `investments`, `investment_profit_history` |
| **captcha** | `api/v1/captcha.py` | Captcha page | `captcha_challenges`, `captcha_earnings` |
| **notifications** | `api/v1/admin_notifications.py`, `utils/notifications.py` | Notification panel | `admin_notifications` |
| **settings** | `api/v1/user.py` (profile update) | Settings page | `users` |

### Isolation Rules
- Backend: edit only files in the module's API, model, service, and schema files
- Frontend: edit only the module's page/component files and API service files
- Never: modify models or services of another module
- To change a shared model: create a feature branch, coordinate with other module leads

### Checking Isolation
```powershell
.opencode\workflow\analyze.ps1 -Module kyc
```
This shows ALL files belonging to the KYC module and their dependencies.

## 6. Dependency Analysis

### Run Before Editing Any File
```powershell
.opencode\workflow\analyze.ps1 -Path "ProductionBackup\backend\app\api\v1\kyc.py"
```

### Output Includes
- **Imports**: all `app.*` dependencies
- **API routes**: all endpoints defined in the file
- **DB tables**: all tables the model maps to
- **Frontend consumers**: JS files that call these APIs
- **Risk level**: Low / Medium / High

### Module Analysis
```powershell
.opencode\workflow\analyze.ps1 -Module kyc
```
This shows all files belonging to a module and analyzes each.

## 7. Impact Analysis

### Before Every Modification

State clearly in the task plan:

```
File:              backend/app/api/v1/kyc.py
API routes:        POST /kyc/submit, GET /kyc/active-package
DB tables:         kyc_verifications, wallet_transactions, users
Frontend pages:    KYC submission form, Admin KYC drawer
Business rules:    KYC fee hold/release/refund, account status change on approval
Risk level:        Medium (financial data, wallet operations)
```

### High-Impact Changes Require Confirmation
- Schema changes (alter/drop table)
- Wallet/balance logic changes
- Authentication/authorization changes
- API contract changes (request/response format)
- MLM rank calculation changes

## 8. AI-Safe Editing

### Guardrails (from AGENTS.md)

1. **Read before write** — always read the latest file version from disk
2. **Detect staleness** — if context is older than the file on disk, reload
3. **Minimal diff** — change only what's needed for the task
4. **No full-file rewrites** — unless explicitly instructed
5. **Preserve style** — match import order, naming, formatting
6. **Module scope** — never touch files outside the task's module
7. **Backward compatible** — don't break existing API contracts
8. **Snapshot first** — run snapshot.ps1 before any change

### Before Edit Checklist

- [ ] Read latest file version
- [ ] Run `snapshot.ps1 -Name "before-<desc>"`
- [ ] Run `analyze.ps1 -Path <file>`
- [ ] State impact assessment
- [ ] Apply minimal diff
- [ ] Run tests
- [ ] Commit with meaningful message

## 9. Testing

### Backend Tests
```powershell
cd ProductionBackup\backend
python -m pytest tests/ -x -q    # Fast fail
python -m pytest tests/ -v       # Verbose
python -m pytest tests/ -k kyc   # Module-specific
```

### Quality Gates
| Gate | Requirement |
|------|-------------|
| Unit tests | All pass |
| Integration tests | All pass |
| No regression | Existing tests still pass |
| Security scan | No secrets, no SQL injection vectors |
| Code review | Required for all merges to `develop` |

### Test Categories
- Unit: individual functions and methods
- Integration: API endpoints end-to-end
- Database: migration up/down, query correctness
- Wallet: deposit, withdrawal, balance operations
- MLM: rank calculation, bonus distribution, matching bonuses
- Security: auth bypass, injection, permission escalation

## 10. Deployment

### Never Automatic
Deployment must always be manual and approved.

### Deployment Pipeline
```
[develop]  →  Test & Regression
     ↓
[main]     →  Security Check
     ↓
[manual]   →  Approval
     ↓
[deploy]   →  Production
     ↓
[verify]   →  Health Check + Rollback on Failure
```

### Pre-Deploy Checklist
- [ ] Snapshot created: `snapshot.ps1 -Name "pre-deploy-<version>"`
- [ ] All tests pass
- [ ] No security issues
- [ ] Migration reviewed (if applicable)
- [ ] DB backup taken
- [ ] Manual approval received

### Server Access
- Host: `13.140.175.187`
- SSH: `ssh arbigrow` (alias configured)
- Docker containers: `arbigrow-backend`, `arbigrow-frontend`, `arbigrow-postgres`, `arbigrow-celery-worker`, `arbigrow-celery-beat`, `arbigrow-redis`
- Backend restart: `docker restart arbigrow-backend`

## 11. Security

### Tokens and Secrets
- **Never** commit PAT tokens, API keys, or passwords
- The old `G:/.git` remote URLs contained PAT tokens — these have been replaced with clean URLs in the new repo
- Use environment variables or `.env` files (gitignored)
- Example env file: `.env.example` (safe to commit)

### Firewall
- Production server restricts port 22 (SSH) and 443 (HTTPS)
- Backend port 8000 is only accessible via Docker internal network
- PostgreSQL port 5432 is only accessible via Docker internal network
- Frontend is proxied through Nginx on port 443

### Audit Trail
Every change is logged via:
- Git commit history
- Snapshot system (timestamps, tags, manifests)
- This documentation tracks the workflow evolution
