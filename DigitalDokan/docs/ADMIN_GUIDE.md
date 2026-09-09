# Admin Guide (Release 2)

Roles: Super Admin/Owner (*), Branch Manager (store ops + users), Manager,
Supervisor, Cashier (sell only), Inventory Manager (stock+products), Accountant
(reports/settings), Auditor (read-only reports+audit). Permissions are service-
enforced; tab hiding is cosmetic. Give `approve.action` sparingly.

Money/VAT: Decimal everywhere; per-product VAT + business default;
`vat_inclusive=1` = shelf price includes VAT. No NBR/Mushak compliance is claimed;
BIN/TIN print on receipts; rates stay editable.

Approvals (Settings thresholds): refunds >1000, cancels >5000, item discounts
>20%, invoice discounts >500, purchase returns >2000. Pending approvals survive
crashes; decide under Users/approver login, then retry. All decisions audited.

Inventory truth: stock = Σ batches = Σ movements (verify via Diagnostics/
`reconcile`). Adjustments need reason + approver; transfers pair out/in movements;
FEFO auto-consumes; returns restock default batch (traceable). Negative balances
are advance credit, never clamped away. Closed shifts are immutable except the
audited reopen→recount→close correction.

Ops: daily backup + off-machine copy; license states (grace keeps selling, expired
keeps reading); audit checkpoints weekly; support bundle = Help → Diagnostics →
Export (no PII). LAN: one server, registered terminals, fail-closed policy.
