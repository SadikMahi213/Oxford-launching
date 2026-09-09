# Security (Release 2)

- Passwords: PBKDF2-HMAC-SHA256 260k + per-user salt; lockout 5×15min; forced
  rotation (`must_change_password`, default admin ships flagged); self-service
  change + admin reset (`user.manage`); login/logout/failures audited.
- RBAC: 40+ dotted codes (`sale.create`…`sync.manage`) + R1 aliases; enforced in
  every service (`session.require`); UI gating is cosmetic; auditors/customers
  denied at the service boundary (tested, incl. over LAN).
- Approvals: thresholds in settings; pending records survive aborts; decide/retry
  flow; sensitive ops (cancel/refund/discount/shift-correct/purchase-return).
- Audit: append-only triggers + hash-chain checkpoints + tamper test; privileged
  search API (`audit.view`).
- Sessions: 15-min idle lock; LAN tokens 12h HMAC, per-request permission reload.
- Hygiene: log redaction, diagnostics counts-only, license secrets via env,
  printer fallback into logs dir (never CWD/install), `.gitignore` covers DBs/logs.
- Findings: no SQL injection (parameterized), no float money, no financial deletes,
  no stack traces to users (ERR references). Residual: file-level attacker with OS
  access can rewrite the DB (mitigated by checkpoints + offline backups, not
  prevented — documented).
