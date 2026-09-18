# Release Checklist (§44) — status per item

- [x] `python -m unittest discover -s tests` — 90/90 green (lab, this machine)
- [ ] Fresh install on clean Windows machine — NOT DONE (no clean VM here)
- [x] Upgrade v1→v2 — automated (synthetic R1 DB test + fresh-init path)
- [x] Data preservation — asserted row-for-row in migration tests
- [x] Backup create+verify — tested (incl. post-crash)
- [x] Restore into clean env — tested incl. rollback + quarantine
- [x] POS every payment method — service-level (cash/card/bkash/nagad/rocket/upay/bank/due/other)
- [x] Returns / inventory ledger / due / supplier / shift reconcile — tested
- [x] Security bypass attempts — RBAC denial suite (cashier + auditor)
- [x] LAN 2-terminal + limited-stock race — tested (1 winner, no oversell)
- [ ] Physical scanner/printer/drawer/scale — NOT DONE (simulators tested; needs hardware matrix)
- [x] Crash termination mid-transaction — real subprocess kill test
- [x] Perf 100k products + 2k-sale volume — measured (see final audit)
- [ ] Installer build (PyInstaller + Inno) — NOT DONE (needs Windows build host with Inno)
- [x] Docs match implementation — audited per feature below

Legend: [x] lab-verified, [ ] requires field/build environment (explicitly listed
as KNOWN LIMITATION in RELEASE_2_FINAL_AUDIT.md, never claimed otherwise).
