# LAN Multi-Terminal (§26)

Architecture: ONE Store Server process owns the central SQLite file; counters are
HTTP clients. Never share the `.db` over SMB. The server reuses the exact same
service functions as single-PC mode (same transactions, RBAC, approvals,
idempotency), one short-lived connection per request, writers serialized by SQLite.

Run: `DigitalDokan-Server.exe --db <path> --host 0.0.0.0 --port 8765`
(`python -m app.server.server ...` for dev; the harmless `sys.modules` warning is
stdlib behavior). Secret via `--secret` or `DIGITALDOKAN_SERVER_SECRET`, else random
per boot (tokens die on restart — re-login). LAN requires a Professional/Enterprise
(or valid trial) license feature flag, enforced at server start.

Auth: `POST /auth/login` (username/password/terminal_code) → 12h HMAC token.
Permissions reloaded per request. Approvals: retry with `approver_token`.

Endpoints: `/health`, `/catalog/{search,barcode,favorites}`, `/sales` + `/{id}/{return,cancel,reprint,details}` +
`/sales/lookup`, `/held` (+`/{id}/resume`), `/purchases` + `/{id}/return`,
`/supplier-pay`, `/due-collect`, `/shifts/open`, `/shifts/{id}/close`, `/cash-io`,
`/expenses`, `/reports/{sales,products,stock,profit}`, `/customers/lookup`,
`/promotions/active`, `/terminals/register`, `/outbox`. Errors: 401 auth, 403 perm,
409 + approval_id, 422 validation, 500 + ERR reference.

Client (`LanClient`): typed methods; server down → `OfflineError` naming the
fail-closed policy. No silent local writes, ever. UI: Settings → LAN mode +
server URL + terminal + Test; status bar shows LAN endpoint; POS routes catalog,
sales, returns, holds and reprints through the bridge (server login asked once).

Verified: 2-client limited-stock race (1 winner), idempotent retry, RBAC/approval
over wire, shift+reports, offline refusal. See `tests/test_lan.py`.
