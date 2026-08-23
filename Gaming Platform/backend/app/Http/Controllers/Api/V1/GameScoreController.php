<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Game;
use App\Services\DemoCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameScoreController extends Controller
{
    public function __construct(
        private readonly DemoCreditService $demoCredits
    ) {}

    /**
     * Submit a game score.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'game_id' => 'required|integer|exists:games,id',
            'score' => 'required|integer|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $game = Game::find($request->input('game_id'));

        if (! $game->isActive()) {
            return ApiResponse::error('This game is not available.', 400);
        }

        $gameScore = $this->demoCredits->recordScore(
            $user,
            $game,
            $request->input('score'),
            $request->input('duration_seconds', 0),
        );

        return ApiResponse::success(
            'Score recorded.',
            [
                'score' => $gameScore,
                'credits_earned' => $gameScore->credits_earned,
                'new_balance' => $this->demoCredits->getBalance($user),
            ],
            201,
        );
    }

    /**
     * Get user's game history.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $this->demoCredits->getGameHistory($user, $perPage);

        return ApiResponse::paginated(
            'Game history retrieved.',
            $paginator,
            $paginator->getCollection(),
        );
    }

    /**
     * Get leaderboard for a specific game.
     */
    public function leaderboard(int $gameId): JsonResponse
    {
        $game = Game::find($gameId);

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $leaderboard = $this->demoCredits->getLeaderboard($game);

        return ApiResponse::success(
            'Leaderboard retrieved.',
            $leaderboard,
        );
    }

    /**
     * Get global leaderboard.
     */
    public function globalLeaderboard(): JsonResponse
    {
        $leaderboard = $this->demoCredits->getGlobalLeaderboard();

        return ApiResponse::success(
            'Global leaderboard retrieved.',
            $leaderboard,
        );
    }
}
