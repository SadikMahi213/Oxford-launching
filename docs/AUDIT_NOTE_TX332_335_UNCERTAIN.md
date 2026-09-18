# Audit Note — UNCERTAIN Matching Bonuses (Tx 332–335, users 313/316) — REQUIRES BUSINESS DECISION

Date: 2026-08-09
Status: NOT reversed — open for business-rule decision

## Context

These four matching-bonus transactions were part of the 06:59 kyc_catchup batch and were
originally generated from **pre-KYC snapshot volume** by the pre-fix code. They were
classified **UNCERTAIN_REQUIRES_REVIEW** in the forensic audit and were deliberately
**NOT included** in the reversal operation (which covered only the definitively invalid
Tx 317–331 and 339–342, total $1,541).

## Transactions

| Tx | User | Amount | Rank | created_at | Basis used |
|----|------|--------|------|-----------|------------|
| 332 | 313 | $4  | 1 (Starter) | 2026-08-08 06:59 | snapshot 1200 (pre-KYC) |
| 333 | 313 | $9  | 2 (Silver)  | 2026-08-08 06:59 | snapshot 1200 (pre-KYC) |
| 334 | 313 | $20 | 3 (Gold)    | 2026-08-08 06:59 | snapshot 1200 (pre-KYC) |
| 335 | 316 | $4  | 1 (Starter) | 2026-08-08 06:59 | snapshot 200 (pre-KYC) |

Total: $37 (user 313 = $33, user 316 = $4).

## Why they are UNCERTAIN rather than INVALID

At the moment the kyc_catchup batch ran (06:59 UTC), the post-KYC eligible volume of
users 313 and 316 was **0**, so these credits came strictly from the pre-KYC snapshot —
which alone would make them retroactive.

However, later the same day the following approved deposits landed in their downlines
(after their respective KYC approvals), giving both users **$1,010 post-KYC volume**:

- deposit 310 — user 383 — $10   — 2026-08-08 08:34
- deposit 311 — user 387 — $500  — 2026-08-08 15:12
- deposit 312 — user 383 — $500  — 2026-08-08 15:16

That post-KYC volume independently qualifies:
- user 313 for rank 3 (Gold, target 1000) → ranks 1–3 = exactly **$33**
- user 316 for rank 3 (Gold, target 1000) → rank 1 = **$4** (already satisfied by snapshot; post-KYC supports up to $33)

So the credited amounts coincide with what the users are legitimately entitled to from
post-KYC volume under the current policy.

## Decision required

1. **Keep (recommended from a business standpoint)**: amounts are already justified by
   post-KYC volume; reversal would be economically neutral only if the deposit-driven
   path re-pays them, otherwise it could create a temporary under-credit for users who
   genuinely earned these ranks from post-KYC volume.
2. **Reverse and re-credit via post-KYC path**: strictly cleaner audit trail (no bonus
   from pre-KYC snapshot) but requires the catch-up logic to then pay the same amounts
   from post-KYC volume to avoid short-changing the users.
3. **Hold unchanged** pending confirmation of what the deposit-driven path would pay.

## Constraints respected during reversal

- Tx 332–335 were left `is_reversed = false`.
- No bonus rows were deleted; the audited reversal mechanism (is_reversed flag +
  wallet recompute from non-reversed rows) was used only for the definitively invalid set.
