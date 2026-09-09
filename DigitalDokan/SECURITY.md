# Security

- PBKDF2-HMAC-SHA256, 260k iterations, per-user 16-byte salt (`infra/security.py`).
  No plaintext passwords/PINs anywhere. Default `admin/Admin@123` is bootstrap-only.
- Lockout: 5 failures -> 15-min lock (`failed_attempts`, `locked_until`).
- RBAC: 16 permissions, 7 roles. **Enforced in services** (`session.require`),
  UI gating is cosmetic only. Verified by test (cashier discount denied).
- Sensitive ops (discount, price change, cancel, refund, adjust stock, backup,
  restore, user admin) require explicit permission; stock adjustment needs a
  manager approver unless caller has `approve`.
- Audit: every sale/return/cancel/purchase/payment/adjustment/shift/expense
  writes `audit_logs` with user, terminal, old/new values; DB triggers make the
  table append-only.
- Sessions auto-lock after 15 min idle (configurable).
- Logs redact password/pin/signature fields. Diagnostics (`check_health.py`)
  expose counts only, never PII.
- License secrets come from `DIGITALDOKAN_LICENSE_SECRET` env at build time;
  nothing secret is hard-coded.
- Findings (self-test): no SQL injection (parameterized queries throughout),
  no float-money, no destructive financial deletes, no stack traces to users
  (reference-ID error dialog).
