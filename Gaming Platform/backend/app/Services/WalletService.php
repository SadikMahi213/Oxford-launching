<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * WalletService is the single source of truth for all wallet mutations.
 *
 * Rules:
 * - Every balance change MUST have a corresponding ledger entry.
 * - All mutations run inside a DB transaction with lockForUpdate().
 * - Balances use decimal(12,4) — never floats.
 * - The ledger is append-only; no UPDATE/DELETE.
 * - Reversals are compensating transactions, not deletions.
 */
class WalletService
{
    /**
     * Get or create a wallet for a user and currency.
     */
    public function getOrCreateWallet(User $user, string $currency = 'USD'): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id, 'currency' => $currency],
            [
                'available_balance' => 0,
                'locked_balance' => 0,
                'status' => Wallet::STATUS_ACTIVE,
            ]
        );
    }

    /**
     * Credit funds to a wallet (add money).
     *
     * @param  string  $referenceType  e.g. 'App\Models\Payment'
     * @param  int|string|null  $referenceId
     * @param  array<string, mixed>  $metadata
     */
    public function credit(
        Wallet $wallet,
        string $amount,
        ?string $referenceType = null,
        $referenceId = null,
        array $metadata = [],
    ): WalletTransaction {
        $this->assertPositiveAmount($amount);
        $this->assertWalletActive($wallet);

        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $metadata) {
            /** @var Wallet $wallet */
            $wallet = $wallet->lockForUpdate();

            $balanceBefore = $wallet->available_balance;
            $balanceAfter = bcadd($balanceBefore, $amount, 4);

            $wallet->update(['available_balance' => $balanceAfter]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'type' => WalletTransaction::TYPE_CREDIT,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * Debit funds from a wallet (subtract money).
     *
     * Fails if available balance is insufficient.
     *
     * @param  string  $referenceType  e.g. 'App\Models\Payment'
     * @param  int|string|null  $referenceId
     * @param  array<string, mixed>  $metadata
     */
    public function debit(
        Wallet $wallet,
        string $amount,
        ?string $referenceType = null,
        $referenceId = null,
        array $metadata = [],
    ): WalletTransaction {
        $this->assertPositiveAmount($amount);
        $this->assertWalletActive($wallet);

        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $metadata) {
            /** @var Wallet $wallet */
            $wallet = $wallet->lockForUpdate();

            $balanceBefore = $wallet->available_balance;

            if (bccomp($balanceBefore, $amount, 4) < 0) {
                throw ApiException::badRequest('Insufficient balance.');
            }

            $balanceAfter = bcsub($balanceBefore, $amount, 4);

            $wallet->update(['available_balance' => $balanceAfter]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'type' => WalletTransaction::TYPE_DEBIT,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * Hold funds (move from available to locked).
     *
     * Used for in-game bets: funds are reserved during a round.
     *
     * @param  string  $referenceType  e.g. 'App\Models\GameRound'
     * @param  int|string|null  $referenceId
     * @param  array<string, mixed>  $metadata
     */
    public function hold(
        Wallet $wallet,
        string $amount,
        ?string $referenceType = null,
        $referenceId = null,
        array $metadata = [],
    ): WalletTransaction {
        $this->assertPositiveAmount($amount);
        $this->assertWalletActive($wallet);

        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $metadata) {
            /** @var Wallet $wallet */
            $wallet = $wallet->lockForUpdate();

            $availableBefore = $wallet->available_balance;

            if (bccomp($availableBefore, $amount, 4) < 0) {
                throw ApiException::badRequest('Insufficient available balance for hold.');
            }

            $availableAfter = bcsub($availableBefore, $amount, 4);
            $lockedAfter = bcadd($wallet->locked_balance, $amount, 4);

            $wallet->update([
                'available_balance' => $availableAfter,
                'locked_balance' => $lockedAfter,
            ]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'type' => WalletTransaction::TYPE_HOLD,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $availableBefore,
                'balance_after' => $availableAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * Release held funds back to available balance.
     *
     * Used when a held bet is cancelled or a round ends without deduction.
     *
     * @param  string  $referenceType  e.g. 'App\Models\GameRound'
     * @param  int|string|null  $referenceId
     * @param  array<string, mixed>  $metadata
     */
    public function release(
        Wallet $wallet,
        string $amount,
        ?string $referenceType = null,
        $referenceId = null,
        array $metadata = [],
    ): WalletTransaction {
        $this->assertPositiveAmount($amount);
        $this->assertWalletActive($wallet);

        return DB::transaction(function () use ($wallet, $amount, $referenceType, $referenceId, $metadata) {
            /** @var Wallet $wallet */
            $wallet = $wallet->lockForUpdate();

            $lockedBefore = $wallet->locked_balance;

            if (bccomp($lockedBefore, $amount, 4) < 0) {
                throw ApiException::badRequest('Insufficient locked balance for release.');
            }

            $lockedAfter = bcsub($lockedBefore, $amount, 4);
            $availableAfter = bcadd($wallet->available_balance, $amount, 4);

            $wallet->update([
                'available_balance' => $availableAfter,
                'locked_balance' => $lockedAfter,
            ]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'type' => WalletTransaction::TYPE_RELEASE,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $wallet->available_balance,
                'balance_after' => $availableAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * Transfer funds between two wallets (atomic).
     *
     * Debits from source, credits to destination in a single DB transaction.
     * Both wallets are locked to prevent race conditions.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function transfer(
        Wallet $fromWallet,
        Wallet $toWallet,
        string $amount,
        ?string $referenceType = null,
        $referenceId = null,
        array $metadata = [],
    ): array {
        $this->assertPositiveAmount($amount);
        $this->assertWalletActive($fromWallet);
        $this->assertWalletActive($toWallet);

        // Prevent self-transfer
        if ($fromWallet->id === $toWallet->id) {
            throw ApiException::badRequest('Cannot transfer to the same wallet.');
        }

        return DB::transaction(function () use ($fromWallet, $toWallet, $amount, $referenceType, $referenceId, $metadata) {
            // Lock both wallets in a consistent order (by ID) to prevent deadlocks.
            $lockOrder = $fromWallet->id < $toWallet->id
                ? [$fromWallet, $toWallet]
                : [$toWallet, $fromWallet];

            /** @var Wallet $first */
            $first = $lockOrder[0]->lockForUpdate();
            /** @var Wallet $second */
            $second = $lockOrder[1]->lockForUpdate();

            // Re-fetch references since we locked in potentially different order.
            if ($first->id === $fromWallet->id) {
                $source = $first;
                $dest = $second;
            } else {
                $source = $second;
                $dest = $first;
            }

            // Verify sufficient balance
            if (bccomp($source->available_balance, $amount, 4) < 0) {
                throw ApiException::badRequest('Insufficient balance for transfer.');
            }

            // Debit source
            $sourceBalanceBefore = $source->available_balance;
            $sourceBalanceAfter = bcsub($sourceBalanceBefore, $amount, 4);
            $source->update(['available_balance' => $sourceBalanceAfter]);

            $debitTx = WalletTransaction::create([
                'wallet_id' => $source->id,
                'user_id' => $source->user_id,
                'type' => WalletTransaction::TYPE_TRANSFER_OUT,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $sourceBalanceBefore,
                'balance_after' => $sourceBalanceAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => array_merge($metadata, ['direction' => 'out']),
            ]);

            // Credit destination
            $destBalanceBefore = $dest->available_balance;
            $destBalanceAfter = bcadd($destBalanceBefore, $amount, 4);
            $dest->update(['available_balance' => $destBalanceAfter]);

            $creditTx = WalletTransaction::create([
                'wallet_id' => $dest->id,
                'user_id' => $dest->user_id,
                'type' => WalletTransaction::TYPE_TRANSFER_IN,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'balance_before' => $destBalanceBefore,
                'balance_after' => $destBalanceAfter,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => array_merge($metadata, ['direction' => 'in']),
            ]);

            return ['debit' => $debitTx, 'credit' => $creditTx];
        });
    }

    /**
     * Get wallet balance summary.
     */
    public function getBalance(Wallet $wallet): array
    {
        return [
            'available_balance' => $wallet->available_balance,
            'locked_balance' => $wallet->locked_balance,
            'total_balance' => $wallet->total_balance,
            'currency' => $wallet->currency,
        ];
    }

    /**
     * Get transaction history for a wallet.
     */
    public function getTransactions(
        Wallet $wallet,
        int $perPage = 15,
        ?string $type = null,
    ): \Illuminate\Contracts\Pagination\Paginator {
        $query = $wallet->transactions()->orderBy('created_at', 'desc');

        if ($type !== null) {
            $query->where('type', $type);
        }

        return $query->paginate($perPage);
    }

    /*
    |--------------------------------------------------------------------------
    | Private Helpers
    |--------------------------------------------------------------------------
    */

    private function assertPositiveAmount(string $amount): void
    {
        if (bccomp($amount, '0', 4) <= 0) {
            throw ApiException::badRequest('Amount must be greater than zero.');
        }
    }

    private function assertWalletActive(Wallet $wallet): void
    {
        if (! $wallet->isActive()) {
            throw ApiException::forbidden('Wallet is not active.');
        }
    }
}
