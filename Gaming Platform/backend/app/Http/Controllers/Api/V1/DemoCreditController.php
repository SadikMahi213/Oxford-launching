<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\DemoCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoCreditController extends Controller
{
    public function __construct(
        private readonly DemoCreditService $demoCredits
    ) {}

    /**
     * Get demo credit balance.
     */
    public function balance(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $balance = $this->demoCredits->getBalance($user);

        return ApiResponse::success(
            'Demo credit balance retrieved.',
            [
                'balance' => $balance,
                'currency' => 'DEM',
                'label' => 'Demo Credits',
                'disclaimer' => 'Demo credits have no monetary value and cannot be converted to money.',
            ],
        );
    }

    /**
     * Claim daily bonus.
     */
    public function claimDailyBonus(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $newBalance = $this->demoCredits->claimDailyBonus($user);

        return ApiResponse::success(
            'Daily bonus claimed!',
            [
                'bonus_amount' => 500,
                'new_balance' => $newBalance,
            ],
        );
    }

    /**
     * Get user statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $totalGamesPlayed = $user->gameScores()->count();
        $totalScore = $user->gameScores()->sum('score');
        $gamesPlayed = $user->gameScores()->distinct('game_id')->count('game_id');
        $bestScore = $user->gameScores()->max('score');
        $avgScore = $user->gameScores()->avg('score');

        return ApiResponse::success(
            'User statistics retrieved.',
            [
                'total_games_played' => $totalGamesPlayed,
                'total_score' => (int) $totalScore,
                'unique_games_played' => $gamesPlayed,
                'best_score' => $bestScore ? (int) $bestScore : 0,
                'average_score' => $avgScore ? (int) round($avgScore) : 0,
                'demo_balance' => $this->demoCredits->getBalance($user),
            ],
        );
    }
}
