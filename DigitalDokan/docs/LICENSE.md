# Licensing (Release 2)

Keys: `DDK1.<payload>.<hmac-sha256>`, signed with `DIGITALDOKAN_LICENSE_SECRET`
(build env; dev fallback only). Payload: plan, iat/exp, device fingerprint,
edition (basic/professional/enterprise), terminal/branch counts, feature list,
state. Device bind tolerates normal upgrades (hostname+MAC+MachineGuid hash).

States: TRIAL (30d from first user, full features) → ACTIVE → EXPIRING (≤7d) →
GRACE (7d past expiry, POS works, banner) → EXPIRED / SUSPENDED. New transactions
(`complete_sale`, `receive_purchase`) call `require_transact()`; EXPIRED/SUSPENDED
raise `LicenseError`. Reports, exports, backups, audit, diagnostics never gate —
historical data is always readable.

Feature flags: `has_feature()` = explicit grant or edition map (basic: POS/
inventory/customers/basic-reports/backup; professional adds supplier/due/reports/
hardware/LAN/promotions; enterprise adds multibranch/audit/sync/api). Server start
requires the `lan` feature. Trial includes everything.

Seller side: `issue_license(plan, days, device?, edition?, terminals?, branches?)`.
Activation stores payload+key in `licenses` + audit row. UI: Settings shows
state/plan/valid/days + activation box. Tests cover all six states, binding,
editions, gating, and history readability while expired.
