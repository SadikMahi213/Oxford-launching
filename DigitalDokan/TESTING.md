# Testing

Run: `python -m unittest discover -s tests -v` (12 tests, ~4s, all passing).

- Unit (`test_money.py`): Decimal quantization, percent guards, full totals
  invariant (subtotal/discount/VAT/grand/due/change), over-discount rejection.
- Integration (`test_integration.py`): atomic sale (stock+ledger+invoice),
  half-write impossibility, due-requires-customer + credit limit, RBAC denial
  (cashier discount), return + cancel reversal workflows + audit immutability,
  5-thread invoice uniqueness, backup verify, brute-force lockout.
- Failure paths covered: bad payment method, invalid product, insufficient
  stock, expired license parse, corrupt-backup refusal (verify step).
- Performance smoke: 10k products -> barcode 0.2ms, name search 3.8ms,
  bulk insert 1.1s (normal laptop hardware).
- Security tests: permission enforcement at service layer, audit DELETE blocked
  by trigger, lockout after 5 attempts.
- UI tests: manual checklist in USER_MANUAL (login, POS sale, purchase,
  reports, settings, backup/restore). Automated Qt tests deferred (headless CI
  has no display); services carry the logic so coverage stays meaningful.
- Not yet: 100k-product soak, multi-terminal concurrency against server backend
  (ships with LAN backend), ESC/POS against physical printers (driver-matrix).
