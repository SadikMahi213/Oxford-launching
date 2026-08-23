<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Game;
use App\Models\GameScore;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class DemoCreditService
{
    private const CURRENCY = 'DEM';
    private const INITIAL_CREDITS = 10000;
    private const DAILY_BONUS = 500;
    private const WIN_MULTIPLIER = 10;

    /**
     * Get or create demo wallet for user.
     */
    public function getOrCreateWallet(User $user): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id, 'currency' => self::CURRENCY],
            [
                'available_balance' => self::INITIAL_CREDITS,
                'locked_balance' => 0,
                'status' => Wallet::STATUS_ACTIVE,
            ]
        );
    }

    /**
     * Get demo credit balance.
     */
    public function getBalance(User $user): int
    {
        $wallet = $this->getOrCreateWallet($user);
        return (int) $wallet->available_balance;
    }

    /**
     * Award demo credits for playing a game.
     */
    public function awardCredits(User $user, int $amount, ?Game $game = null, ?int $score = null): int
    {
        $wallet = $this->getOrCreateWallet($user);

        return DB::transaction(function () use ($wallet, $amount, $game, $score, $user) {
            $wallet = $wallet->lockForUpdate();
            $balanceBefore = $wallet->available_balance;
            $balanceAfter = bcadd($balanceBefore, (string) $amount, 4);

            $wallet->update(['available_balance' => $balanceAfter]);

            $metadata = ['reason' => 'game_reward'];
            if ($game) {
                $metadata['game_id'] = $game->id;
                $metadata['game_name'] = $game->name;
            }
            if ($score !== null) {
                $metadata['score'] = $score;
            }

            \App\Models\WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => 'completed',
                'metadata' => $metadata,
            ]);

            return (int) $balanceAfter;
        });
    }

    /**
     * Deduct demo credits for playing a game (entry fee simulation).
     */
    public function deductCredits(User $user, int $amount, ?Game $game = null): int
    {
        $wallet = $this->getOrCreateWallet($user);

        return DB::transaction(function () use ($wallet, $amount, $game, $user) {
            $wallet = $wallet->lockForUpdate();

            if (bccomp($wallet->available_balance, (string) $amount, 4) < 0) {
                throw ApiException::badRequest('Insufficient demo credits.');
            }

            $balanceBefore = $wallet->available_balance;
            $balanceAfter = bcsub($balanceBefore, (string) $amount, 4);

            $wallet->update(['available_balance' => $balanceAfter]);

            $metadata = ['reason' => 'game_entry'];
            if ($game) {
                $metadata['game_id'] = $game->id;
                $metadata['game_name'] = $game->name;
            }

            \App\Models\WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'debit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => 'completed',
                'metadata' => $metadata,
            ]);

            return (int) $balanceAfter;
        });
    }

    /**
     * Claim daily bonus.
     */
    public function claimDailyBonus(User $user): int
    {
        $wallet = $this->getOrCreateWallet($user);

        $lastBonus = \App\Models\WalletTransaction::where('user_id', $user->id)
            ->where('type', 'credit')
            ->where('metadata->reason', 'daily_bonus')
            ->latest()
            ->first();

        if ($lastBonus && $lastBonus->created_at->isToday()) {
            throw ApiException::badRequest('Daily bonus already claimed today.');
        }

        return $this->awardCredits($user, self::DAILY_BONUS, null, null);
    }

    /**
     * Record a game score and award credits.
     */
    public function recordScore(User $user, Game $game, int $score, int $durationSeconds = 0): GameScore
    {
        $creditsEarned = (int) ceil($score / self::WIN_MULTIPLIER);

        $gameScore = GameScore::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'score' => $score,
            'credits_earned' => $creditsEarned,
            'duration_seconds' => $durationSeconds,
        ]);

        if ($creditsEarned > 0) {
            $this->awardCredits($user, $creditsEarned, $game, $score);
        }

        $game->increment('play_count');

        if ($score > $game->max_score) {
            $game->update(['max_score' => $score]);
        }

        return $gameScore;
    }

    /**
     * Get user's game history.
     */
    public function getGameHistory(User $user, int $perPage = 15): \Illuminate\Contracts\Pagination\Paginator
    {
        return GameScore::where('user_id', $user->id)
            ->with('game')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get leaderboard for a game.
     */
    public function getLeaderboard(Game $game, int $limit = 10): \Illuminate\Support\Collection
    {
        return GameScore::where('game_id', $game->id)
            ->select('user_id', DB::raw('MAX(score) as best_score'), DB::raw('COUNT(*) as games_played'))
            ->with('user:id,name')
            ->groupBy('user_id')
            ->orderByDesc('best_score')
            ->limit($limit)
            ->get();
    }

    /**
     * Get global leaderboard.
     */
    public function getGlobalLeaderboard(int $limit = 10): \Illuminate\Support\Collection
    {
        return GameScore::select('user_id', DB::raw('SUM(score) as total_score'), DB::raw('COUNT(DISTINCT game_id) as games_played'), DB::raw('COUNT(*) as total_games'))
            ->with('user:id,name')
            ->groupBy('user_id')
            ->orderByDesc('total_score')
            ->limit($limit)
            ->get();
    }
}
