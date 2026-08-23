<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LaunchGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\GameSessionResource;
use App\Http\Responses\ApiResponse;
use App\Models\Game;
use App\Services\GameProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameLaunchController extends Controller
{
    public function __construct(
        private readonly GameProviderService $service
    ) {}

    /**
     * Launch a game for the authenticated user.
     */
    public function launch(LaunchGameRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $game = Game::with('provider')->find($request->input('game_id'));

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $result = $this->service->launchGame(
            $game,
            $user,
            $request->boolean('demo'),
        );

        return ApiResponse::success(
            'Game launched.',
            [
                'session' => new GameSessionResource($result['session']),
                'launch_url' => $result['launch_url'],
                'session_token' => $result['session_token'],
                'extra' => $result['extra'],
            ],
            201,
        );
    }

    /**
     * Get the user's game sessions.
     */
    public function sessions(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $this->service->getUserSessions($user, $perPage);

        return ApiResponse::paginated(
            'Sessions retrieved.',
            $paginator,
            GameSessionResource::collection($paginator->getCollection()),
        );
    }
}
