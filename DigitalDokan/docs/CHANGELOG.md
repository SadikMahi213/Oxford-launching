# Changelog (Release 2 line)

## 2.0.0 (2026-09-09) — Enterprise upgrade
Architecture hardening: versioned migrations (v1→v2, backup-first, rollback-tested),
Unit-of-Work helper, atomic PO sequencing, idempotency keys (sales + purchases).
Security: dotted RBAC (R1 aliases preserved) enforced in every service, approval
workflow with thresholds, password rotation, login/logout audit, audit hash-chain
checkpoints, tamper detection. Transactions: purchase returns, stock transfers,
historical unit_cost margins, negative-balance credit semantics, shift-scoped
expenses, shift lifecycle + corrections. POS: split payments, line edit/remove,
discount-aware totals, promotions (percent/fixed/category/group, best-pick),
unit conversions (carton→piece etc.), favorites, held-bill resume, Upay, exact
paisa money inputs, Bangla/English chrome. Hardware: scanner/scale (serial +
vendor profiles + simulators)/display/label/A4 abstractions, central print
service with job ledger, 58mm support, logs-dir fallback. LAN: stdlib store
server reusing service layer (catalog, sales, returns, purchases, shifts, reports,
terminals, outbox), token auth, approver flow, explicit fail-closed offline policy,
POS bridge + Settings config. Sync: transactional outbox + retry/backoff engine.
Licensing: TRIAL/ACTIVE/EXPIRING/GRACE/EXPIRED/SUSPENDED, editions + feature flags,
transaction gating (history always readable). Reports: hourly/weekly/register/branch,
receivables/payables, cash reconciliation, pagination. Backup: schema-version
compat, pre/post validation, failed-restore rollback, quarantine, health indicator,
restart-restore flow. Diagnostics: Help→Diagnostics, hardware self-tests, audit
search, JSON export. Installer: 2.0.0 script, ProgramData dirs, server bundle,
test-gated build. Tests: 90 (was 12), incl. crash-kill, races, recovery, invariants.
Perf: 100k products — barcode 0.4ms, search 49ms; 2000 atomic sales in 1.3s.

## 1.0.0 — Release 1 (baseline, see root CHANGELOG.md)
