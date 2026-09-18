# Release 2 Final Audit (2026-09-09, branch release/2.0-enterprise)

## Test results
- Suite: `python -m unittest discover -s tests` → **90/90 OK** (~30s, this machine).
  Breakdown: money 4, integration (R1) 8, migrations 5, RBAC/ledger 14, recovery 4,
  promos/units 9, hardware/print 7, LAN 9, sync 4, licensing 6, backup-r2 4,
  security-r2 6, reports 5, misc (i18n/exports/datadirs) 5. No R1 test removed or weakened.
- E2E reconciliation: full sale→due→collect→return→shift flow verifies clean via
  `reconcile.verify_database()` (sale/due/payable/stock/shift invariants exact).

## Performance (measured, same laptop hardware)
- 100k products: barcode lookup 0.4ms (target <10ms), name search 49ms (target <100ms).
- 2,000 atomic sales in 1.3s (~0.7ms/sale); stock reconcile instant.
- R1 baselines preserved (10k: 0.2ms / 3.8ms).

## IMPLEMENTED + VERIFIED (test/evidence in repo)
Migrations v1→v2 (upgrade/rollback/downgrade-refusal tests); dotted RBAC + service
enforcement (denial suite); approvals + thresholds (pending/decide/retry); sale +
purchase idempotency; PO sequencing; purchase returns; stock transfers; historical
unit_cost margins; unclamped balances; shift-scoped expenses + lifecycle + audited
reopen; promos (4 kinds, best-pick, windows) + unit conversions + favorites; split-pay
POS + line edit + paisa inputs + held resume + Upay; HAL (scanner/scale/display/label/
A4 + simulators) + print service + job ledger + 58mm; LAN server/client/bridge +
offline fail-closed + races; outbox + retry engine; 6 license states + editions +
txn gating; report groupings + receivables/payables + reconciliation + pagination;
backup compat/rollback/health/restart-restore; diagnostics + audit search +
checkpoints/tamper test + rotation + login audit; ProgramData layout; i18n chrome
(44 keys en=bn); XLSX/PDF optional exports; crash-kill + WAL recovery tests.

## PARTIALLY IMPLEMENTED (works, boundaries documented)
- i18n: shell/POS/receipt chrome is keyed (Bangla usable); dynamic messages + back-office
  tabs remain English (keys to be extended, no hard-coded Bengali-blockers).
- Cloud sync: outbox + engine + transport interface + semantics tests; NO vendor
  endpoint bundled (by design — core never depends on cloud).
- Scale/display/label: abstraction + profiles + simulators complete; physical
  wiring needs per-site port/vendor confirmation.
- A4: HTML model + Qt print/preview path; paper-size tuning per printer model is field work.

## NOT IMPLEMENTED (explicitly out of scope, no stubs pretending otherwise)
Multi-branch central management, Buy-X-Get-Y/bundle/time-based promos, customer display
content beyond totals, cloud vendor connector, automated Qt GUI tests (headless CI),
NBR/Mushak e-filing (no compliance claimed anywhere).

## KNOWN LIMITATIONS (must clear before store rollout)
1. No clean-machine install test (needs VM + Inno) — installer script is code-reviewed only.
2. No physical hardware matrix (scanner/printer/drawer/scale) — simulators only.
3. LAN soak (4+ counters, all-day) not run — protocol + race tests pass.
4. Returns restock the default batch (traceable, FEFO-exact restock is roadmap).
5. `sales.status='held'` legacy value unused (holds live in `held_sales`).
6. Trial clock = first-user creation; reinstalls reset it (acceptable for licensed rollout).

## Security / integrity / recovery findings
- All §33 categories covered except automated GUI tests; RBAC bypass suite green.
- Invariants (§34) machine-checked after every E2E; migration + restore validated.
- Backup integrity, quarantine, rollback, health all exercised; audit chain detects
  file-level edits (proven on a tampered copy).
- No float money, no plaintext secrets, no financial deletes, no SMB-shared DB.

## Upgrade / install verification
- Synthetic R1→v2 upgrade preserves every row (test); fresh init lands on v2.
- Installer + build script updated (2.0.0, ProgramData dirs, server bundle, test gate)
  but not executed here — see limitation 1.

Commercial verdict: code-complete and lab-verified for single-store + LAN pilot;
ship to a pilot store with backup + diagnostics routine, then clear limitations 1–3
for general release. Data integrity > convenience throughout — no step was skipped.
