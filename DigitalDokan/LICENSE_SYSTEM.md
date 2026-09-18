# License System

Plans (feature-flag ready, same codebase): trial, single-PC, single-store,
multi-terminal, multi-branch/enterprise (later).

- Key format: `DDK1.<base64url(payload)>.<hmac-sha256>` signed with the build
  secret (`DIGITALDOKAN_LICENSE_SECRET`; dev fallback only).
- Payload: `{plan, iat, exp, device}`. `exp=0` means perpetual.
- Device binding: `device_fingerprint()` = sha256(hostname|mac|MachineGuid)[:32];
  tolerant to disk/RAM upgrades, changes only on motherboard/Computer-rename class
  events; re-activation is the documented path.
- Offline: activation and checks need no internet. `status()` reports
  valid/plan/days-left. Expiry has a **7-day grace period** where POS continues
  and the admin banner warns — core sales never hard-stop on day one.
- Storage: `licenses(id=1, payload, signature)`; verified on startup and shown
  in Settings tab.
- Issue keys (seller side): `python -c "from app.infra.license_manager import
  issue_license; print(issue_license('single-store', 365))"` with the release
  secret in env, optionally passing the customer's fingerprint for binding.
