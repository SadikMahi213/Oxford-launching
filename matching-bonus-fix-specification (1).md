# Matching Bonus System — Correct Functionality Specification

**Purpose:** This document defines exactly how Team Volume, KYC eligibility, Rank, and Matching Bonus must work together. Use this as the spec/prompt to fix the current system — it is written against two confirmed bugs found in production testing (see §5).

---

## 1. Core Concept

There are two different volume figures that must never be confused:

| Term | Definition |
|---|---|
| **Team Volume** | Own approved deposits + downline approved deposits (up to 40 generations). Always reflects the *current total*, grows forever, never resets. |
| **Bonus-Eligible Volume** | The subset of Team Volume that is allowed to generate a Matching Bonus. This is **not** the same as Team Volume — see §2. |

Rank is evaluated against **Team Volume** (total). Matching Bonus is evaluated against **Bonus-Eligible Volume** (a strict subset). Conflating these two is the root cause of the current bugs.

---

## 2. The KYC Snapshot Rule (Critical)

When a user's KYC is approved, the system must:

1. Read the user's **current Team Volume** at that exact moment.
2. Store it permanently as `team_volume_at_kyc_approval` on the user record. This value **never changes again**.
3. Assign the correct **Rank** based on that Team Volume (rank thresholds apply to full Team Volume, not eligible volume).
4. **Generate zero bonus** for any of that volume — regardless of how many rank bands it crosses.

```
team_volume_at_kyc_approval = team_volume_at_this_exact_moment   // frozen forever
```

**This value must be permanently excluded from bonus calculation — not deferred.** The confirmed bug in the current system is that pre-KYC volume is *not* excluded, it's *deferred*: the first time any bonus calculation runs after KYC, the system pays out for every band from 0 up to the user's rank at that time, as if that volume were new. This must not happen under any circumstance, no matter when or how many times the bonus calculation runs.

---

## 3. Correct Bonus Calculation Formula

On every new approved deposit event (own or downline) for an already-KYC'd user:

```
new_team_volume = team_volume_before_this_deposit + deposit_amount

eligible_volume_total = new_team_volume - team_volume_at_kyc_approval
    (never negative; if new_team_volume <= snapshot, eligible_volume_total = 0)

bonus_due = bonus_for_bands_crossed(
    from = max(team_volume_at_kyc_approval, bonused_up_to),
    to   = new_team_volume
)
```

Where `bonused_up_to` is a running counter (see §4) tracking exactly how much volume has already been converted into a bonus, so no volume is ever bonused twice.

**Band-crossing bonus logic:** for each rank band the volume passes through between `from` and `to`, only the portion of that band that falls strictly after `team_volume_at_kyc_approval` (and after `bonused_up_to`) is bonused, at that band's own rate.

### Worked example (matches the real bug case found in testing)

- `team_volume_at_kyc_approval` = **1200** (user was already Gold Leader pre-KYC)
- New deposit of 1500 brings Team Volume to **2700**
- Bands: Starter (0–200, 2%), Silver (200–500, 3%), Gold (500–1000, 4%), Platinum (1000–2400, 5%), Team Manager (2400–10000, 6%)

**Wrong (current system) behavior:** pays Starter + Silver + Gold in full = 4 + 9 + 20 = **33.00 USDT**, ignoring the snapshot entirely.

**Correct behavior:** volume from 0–1200 is pre-KYC and permanently excluded. Only volume from 1200 → 2700 is eligible:
| Band portion | Range | Volume | Rate | Bonus |
|---|---|---|---|---|
| Platinum (remaining) | 1200 → 2400 | 1200 | 5% | 60.00 |
| Team Manager (partial) | 2400 → 2700 | 300 | 6% | 18.00 |
| **Total** | | | | **78.00 USDT** |

Starter/Silver/Gold bands generate **0.00 USDT**, since that volume is entirely pre-KYC.

### Worked example (partial-band snapshot)

- `team_volume_at_kyc_approval` = **225** (falls inside the Silver band, 200–500)
- Silver band eligible portion = 500 − 225 = 275 → bonus = 275 × 3% = **8.25 USDT** (not 9.00 — the current system incorrectly uses the band's starting threshold of 200 instead of the actual snapshot of 225 when the snapshot isn't a threshold value)

**Rule of thumb:** the snapshot value itself is what matters, never the nearest rank threshold.

---

## 4. Required Data Fields

| Field | Type | Purpose |
|---|---|---|
| `kyc_approved_at` | timestamp | When the KYC gate was passed |
| `team_volume_at_kyc_approval` | decimal | Frozen snapshot — the exact Team Volume at KYC approval, never a rounded/threshold value |
| `bonused_up_to` | decimal | Running total of volume already converted to bonus (starts equal to `team_volume_at_kyc_approval`, increases with each bonus event) |
| `matching_bonus_ledger` | table | One row per bonus event: amount, rate, band/rank, source deposit reference, timestamp |
| `matching_bonus_wallet_tx` | table | One row per wallet credit, 1:1 linked to a ledger entry |
| `current_rank` | field | Must be recalculated from **total Team Volume** on every deposit event — independent of bonus calculation |

---

## 5. Confirmed Bugs This Spec Must Fix

**Bug 1 — Pre-KYC volume is not permanently excluded, only deferred.**
Symptom: the first bonus calculation after KYC approval pays out for every band up to the user's rank at KYC time, even though that volume existed before KYC. Fix: bonus calculation must always subtract `team_volume_at_kyc_approval` (and `bonused_up_to`) from the eligible base — never compute "bands up to current rank" from zero.

**Bug 2 — `current_rank` does not advance past the rank held at KYC approval time.**
Symptom: Team Volume reached 2700 (past the 2400 Platinum threshold, shown as "Achieved" in the rank table), but "Current Rank" still displayed "Gold Leader." Fix: rank must be recalculated against total Team Volume on every deposit event, completely independent of whether a bonus was generated. Rank progression and bonus generation are two separate outputs of the same event — a bug in one must not block the other.

**Bug 3 — Band bonus uses the band's threshold instead of the actual snapshot when the snapshot falls inside a band.**
Symptom: with a 225 pre-KYC snapshot inside the Silver band (200–500), the system paid the full 9.00 USDT (as if the snapshot were exactly 200) instead of the correct 8.25 USDT (275 eligible USDT × 3%). Fix: always use the exact `team_volume_at_kyc_approval` value in the calculation, never the nearest lower threshold.

---

## 6. Test Cases to Re-Verify After the Fix

1. **Snapshot exactly on a threshold** (e.g., 1000): confirm no partial-band rounding issues.
2. **Snapshot inside a band** (e.g., 225, or 1200): confirm only the post-snapshot portion of that band is bonused.
3. **Multiple bands crossed in one deposit**: confirm each band is bonused at its own correct rate, not a single blended rate.
4. **Rank vs. bonus independence**: confirm rank always matches current Team Volume, even in a scenario where bonus calculation is artificially blocked or delayed.
5. **Duplicate event protection**: fire the same deposit-approval event twice; confirm `bonused_up_to` prevents any volume from being bonused twice.
6. **Zero eligible volume**: a user whose new deposit doesn't move Team Volume past `team_volume_at_kyc_approval` plus already-bonused volume should generate **0** bonus, not a negative or fractional-band error.

---

## 7. Acceptance Criteria

- ✅ Volume that existed before KYC approval never generates a bonus, under any sequence of later deposit events.
- ✅ Bonus calculation always uses the exact `team_volume_at_kyc_approval` figure, never a rounded threshold.
- ✅ `current_rank` always reflects total Team Volume and updates independently of bonus generation.
- ✅ No volume is ever counted twice toward a bonus (`bonused_up_to` is strictly increasing and gapless).
- ✅ Bonus Wallet balance always equals the sum of `matching_bonus_ledger` entries.
- ✅ Admin and user dashboards read from the same source of truth for Team Volume, Rank, and Bonus.
