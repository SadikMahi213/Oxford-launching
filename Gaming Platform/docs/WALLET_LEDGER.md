# Wallet & Ledger Architecture

## Overview

The wallet system manages user balances with append-only ledger transactions. All financial operations use database transactions with row-level locking to ensure atomicity and prevent race conditions.

## Core Principles

1. **Append-Only Ledger**: Every balance change creates a new transaction record. No UPDATE/DELETE on transaction history.
2. **Atomic Operations**: All mutations run inside `DB::transaction()` with `lockForUpdate()`.
3. **Integer Money**: Balances stored as `decimal(12,4)` — never floating point.
4. **Reversals are Compensating Transactions**: To reverse a credit, create a debit transaction (not delete the credit).

## Models

### Wallet
- `user_id` — Owner of the wallet
- `currency` — ISO 4217 currency code (default: USD)
- `available_balance` — Funds available for use
- `locked_balance` — Funds held (e.g., during active game rounds)
- `status` — Active, frozen, or closed

### WalletTransaction
- `wallet_id` — The wallet this transaction belongs to
- `user_id` — The user (denormalized for quick queries)
- `type` — Transaction type enum
- `reference_type` / `reference_id` — Polymorphic link to the source (e.g., GameSession, Payment)
- `amount` — Transaction amount (positive for credits, debits for deductions)
- `balance_before` — Available balance before this transaction
- `balance_after` — Available balance after this transaction
- `status` — Completed, pending, or failed
- `metadata` — Additional transaction data

## Transaction Types

| Type | Description |
|------|-------------|
| `credit` | Add funds to wallet |
| `debit` | Subtract funds from wallet |
| `hold` | Move from available to locked |
| `release` | Move from locked back to available |
| `transfer_out` | Outgoing transfer to another wallet |
| `transfer_in` | Incoming transfer from another wallet |

## Database Schema

### wallets
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | FK to users |
| currency | varchar(3) | ISO 4217 currency code |
| available_balance | decimal(12,4) | Available funds |
| locked_balance | decimal(12,4) | Held funds |
| status | varchar(20) | Wallet status |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### wallet_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| wallet_id | bigint | FK to wallets |
| user_id | bigint | FK to users |
| type | varchar(20) | Transaction type |
| reference_type | varchar(200) | Polymorphic type |
| reference_id | bigint | Polymorphic ID |
| amount | decimal(12,4) | Transaction amount |
| balance_before | decimal(12,4) | Balance before |
| balance_after | decimal(12,4) | Balance after |
| status | varchar(20) | Transaction status |
| metadata | json | Additional data |
| created_at | timestamp | Transaction time |

## API Endpoints

### Authenticated
- `GET /api/v1/wallet` — Get user's wallets
- `GET /api/v1/wallet/{id}` — Get specific wallet
- `GET /api/v1/wallet/{id}/transactions` — Get transaction history
- `POST /api/v1/wallet/credit` — Credit funds (admin/system)
- `POST /api/v1/wallet/debit` — Debit funds
- `POST /api/v1/wallet/hold` — Hold funds (for game rounds)
- `POST /api/v1/wallet/release` — Release held funds
- `POST /api/v1/wallet/transfer` — Transfer to another user

## Balance Calculation

```
total_balance = available_balance + locked_balance
```

- `available_balance`: Funds the user can spend or withdraw
- `locked_balance`: Funds reserved during active operations (e.g., game rounds)

## Concurrency Control

- All balance mutations use `lockForUpdate()` on the wallet row
- Transfers lock both wallets in consistent order (by ID) to prevent deadlocks
- Database transactions ensure atomicity of multi-step operations

## Example: Credit Flow

1. Receive credit request with amount
2. Validate amount > 0 and wallet is active
3. Start DB transaction
4. Lock wallet row with `lockForUpdate()`
5. Read current `available_balance` as `balanceBefore`
6. Calculate `balanceAfter = balanceBefore + amount`
7. Update wallet's `available_balance`
8. Create WalletTransaction with `type=credit`, `balance_before`, `balance_after`
9. Commit transaction

## Example: Hold Flow (Game Round)

1. User places a bet
2. Hold funds from available to locked balance
3. During round: locked balance reserved
4. Round ends:
   - Win: release hold + credit winnings
   - Lose: keep hold (deducted from balance)
