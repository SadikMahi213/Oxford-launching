# Architecture (Release 2)

```
PySide6 UI (app/ui) ──services──▶ single-PC SQLite (WAL)   [standalone]
        │ bridge (lan-required)
        ▼
app/server Store Server (stdlib HTTP) ──same services──▶ central SQLite [LAN]
        │
app/sync outbox + retry engine ──pluggable Transport──▶ (future cloud)
```

Layers: Qt widgets → services (transactions + RBAC + approvals + licensing gates)
→ domain (money/pricing/invoices/units/promotions, pure) → infra (db, versioned
migrations, UoW, backup, licensing, security) → SQLite / Win32 printing / dirs.

Rules enforced: no SQL for writes outside services (POS reads via service helpers);
money Decimal only (paisa-integer Qt inputs); financial ops single-transaction with
idempotency keys; authorization in services (`Session.require`, dotted codes, R1
aliases); audit append-only + hash checkpoints; print jobs separate from ledger;
settings kv for thresholds/policy (no hard-coding); optional deps (openpyxl,
reportlab, pyserial, win32print) degrade gracefully.

Key modules: pos/purchase/party/inventory/shift/report/settings/print/diagnostics/
approval/reconcile services; hardware.* (scanner/scale/display/label/A4 + simulators);
server (HTTP+tokens+client+bridge); sync outbox. Full map + debt log:
`docs/ARCHITECTURE_AUDIT_R2.md` (R1 baseline; R2 deltas in CHANGELOG).
