<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreGameRequest;
use App\Http\Requests\Api\V1\UpdateGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Responses\ApiResponse;
use App\Models\GameProvider;
use App\Services\GameProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function __construct(
        private readonly GameProviderService $service
    ) {}

    /**
     * List featured games.
     */
    public function featured(): JsonResponse
    {
        $games = \App\Models\Game::with('category')
            ->where('is_featured', true)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->limit(20)
            ->get();

        return ApiResponse::success(
            'Featured games retrieved.',
            GameResource::collection($games),
        );
    }

    /**
     * List games with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 15), 100);

        $paginator = $this->service->listGames(
            providerId: $request->input('provider_id') ? (int) $request->input('provider_id') : null,
            categoryId: $request->input('category_id') ? (int) $request->input('category_id') : null,
            gameType: $request->input('game_type'),
            featuredOnly: $request->boolean('featured'),
            perPage: $perPage,
        );

        return ApiResponse::paginated(
            'Games retrieved.',
            $paginator,
            GameResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Show a single game.
     */
    public function show(int $id): JsonResponse
    {
        $game = $this->service->getGame($id);

        return ApiResponse::success(
            'Game retrieved.',
            new GameResource($game),
        );
    }

    /**
     * Show a single game by slug.
     */
    public function showBySlug(string $slug): JsonResponse
    {
        $game = \App\Models\Game::with('category')->where('slug', $slug)->first();

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        return ApiResponse::success(
            'Game retrieved.',
            new GameResource($game),
        );
    }

    /**
     * Create a game under a provider (admin).
     */
    public function store(StoreGameRequest $request): JsonResponse
    {
        $provider = GameProvider::find($request->input('provider_id'));

        if (! $provider) {
            return ApiResponse::error('Provider not found.', 404);
        }

        $game = $this->service->createGame($provider, $request->validated());

        return ApiResponse::success(
            'Game created.',
            new GameResource($game->load(['provider', 'category'])),
            201,
        );
    }

    /**
     * Update a game (admin).
     */
    public function update(UpdateGameRequest $request, int $id): JsonResponse
    {
        $game = $this->service->getGame($id);

        $updated = $this->service->updateGame($game, $request->validated());

        return ApiResponse::success(
            'Game updated.',
            new GameResource($updated->load(['provider', 'category'])),
        );
    }
}
