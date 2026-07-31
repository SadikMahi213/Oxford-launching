# AI Development Workflow

This file defines the rules for AI-assisted development in the ArbiGrow project.

## Before Any Edit

### 1. Read Latest Version
Always read the current file from disk first. Compare with any context you have. If the file has changed since your last read, reload it.

### 2. Create Snapshot
Run before making changes:
```
.opencode\workflow\snapshot.ps1 -Name "before-<brief-description>"
```

### 3. Dependency Analysis
Run to understand impact:
```
.opencode\workflow\analyze.ps1 -Path "<file-to-edit>"
```
Review all dependencies, API routes, DB tables, and frontend consumers listed.

### 4. Impact Assessment
Before editing, state clearly:
- **File**: path to modify
- **API routes affected**: list them
- **DB tables affected**: list them
- **Frontend pages affected**: list them
- **Business rules affected**: describe
- **Risk level**: Low / Medium / High

## Editing Rules

### Never
- **Rewrite entire files** unless explicitly instructed (and even then, prefer minimal diff)
- **Replace modules** — modify existing modules only
- **Delete logic** unless explicitly told to
- **Commit to main/master branch** — never work on the production branch
- **Overwrite newer code** with stale context — always read the latest version first
- **Introduce secrets, tokens, passwords, or credentials** into code
- **Modify unrelated modules** — stay within the scope of the task

### Always
- **Apply minimal diffs** — change only what's needed
- **Preserve formatting** — match the existing code style (import order, naming conventions, comment style)
- **Preserve backward compatibility** — don't break existing API contracts
- **Keep the application online** — no destructive operations without confirmation
- **Add comments only when asked** — match the existing project's commenting style
- **Commit logical changes** — meaningful commit messages, one logical change per commit

## Branch Rules

| Branch | Purpose | Protected | Deployable |
|--------|---------|-----------|------------|
| `main` | Production | Yes | Yes (manual) |
| `develop` | Integration | Yes | No |
| `feature/<module>` | Feature work | No | No |
| `hotfix/<desc>` | Urgent fixes | No | No |

- Create feature branches from `develop`
- Create hotfix branches from `main`
- Never commit directly to `main` or `develop`

## Snapshot Before Change

Before every modification session:
```
.opencode\workflow\snapshot.ps1 -Name "before-<description>"
```

This creates:
- Git tag (`snapshot/before-<description>`)
- Migration state backup
- Environment backup
- Configuration backup

## Rollback

To undo all changes and restore to a previous state:
```
.opencode\workflow\rollback.ps1 -Target "snapshot/before-<description>"
```

This restores:
- Source code (git checkout)
- Configuration files
- Migration state

## Commit Message Format

```
<type>(<module>): <brief description>

<details if needed>
```

Types: `fix`, `feat`, `refactor`, `test`, `docs`, `chore`, `revert`
Modules: `auth`, `wallet`, `kyc`, `deposit`, `withdraw`, `mlm`, `rank`, `ecommerce`, `admin`, `infra`

## Testing

After any modification, run relevant tests:
- Backend: `cd ProductionBackup\backend && python -m pytest tests/ -x -q`
- Frontend: `cd ProductionBackup\frontend && npm test`
- If tests fail, do not mark the task as completed

## Production Safety

Never deploy automatically. Deployment requires:
1. All tests pass
2. Security check
3. Manual approval
4. Snapshot before deploy
5. Deploy with rollback capability
