<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreGameRequest;
use App\Http\Requests\Api\V1\UpdateGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Responses\ApiResponse;
use App\Models\Game;
use App\Models\GameCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Get admin dashboard statistics.
     */
    public function stats(): JsonResponse
    {
        $totalGames = Game::count();
        $activeGames = Game::where('is_active', true)->count();
        $inactiveGames = Game::where('is_active', false)->count();
        $featuredGames = Game::where('is_featured', true)->count();
        $totalUsers = \App\Models\User::count();
        $gamesPlayedToday = \App\Models\GameScore::whereDate('created_at', today())->count();
        $gamesPlayedMonth = \App\Models\GameScore::whereMonth('created_at', now()->month)->count();
        $activeUsers = \App\Models\GameScore::where('created_at', '>=', now()->subDays(30))->distinct('user_id')->count('user_id');
        $recentSessions = \App\Models\GameScore::with('game', 'user')->latest()->limit(10)->get();

        $mostPlayed = Game::orderByDesc('play_count')->limit(5)->get();
        $highestScoring = Game::orderByDesc('max_score')->limit(5)->get();

        return ApiResponse::success(
            'Dashboard stats retrieved.',
            [
                'total_games' => $totalGames,
                'active_games' => $activeGames,
                'inactive_games' => $inactiveGames,
                'featured_games' => $featuredGames,
                'total_users' => $totalUsers,
                'games_played_today' => $gamesPlayedToday,
                'games_played_this_month' => $gamesPlayedMonth,
                'active_users_30d' => $activeUsers,
                'most_played_games' => $mostPlayed,
                'highest_scoring_games' => $highestScoring,
                'recent_sessions' => $recentSessions,
            ],
        );
    }

    /**
     * List all games with admin details.
     */
    public function games(Request $request): JsonResponse
    {
        $query = Game::with(['category', 'provider']);

        if ($request->has('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $query->orderBy('sort_order')->paginate($perPage);

        return ApiResponse::paginated(
            'Games retrieved.',
            $paginator,
            GameResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Create a game.
     */
    public function storeGame(StoreGameRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['provider_id']) && isset($data['external_game_id'])) {
            if (Game::where('provider_id', $data['provider_id'])
                ->where('external_game_id', $data['external_game_id'])
                ->exists()) {
                return ApiResponse::error('A game with this external_game_id already exists for this provider.', 400);
            }
        }

        if (! isset($data['game_slug'])) {
            $data['game_slug'] = \Illuminate\Support\Str::slug($data['name']);
        }

        $game = Game::create($data);

        return ApiResponse::success(
            'Game created.',
            new GameResource($game->load(['category', 'provider'])),
            201,
        );
    }

    /**
     * Update a game.
     */
    public function updateGame(UpdateGameRequest $request, int $id): JsonResponse
    {
        $game = Game::find($id);

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $game->update($request->validated());

        return ApiResponse::success(
            'Game updated.',
            new GameResource($game->fresh()->load(['category', 'provider'])),
        );
    }

    /**
     * Toggle game active status.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $game = Game::find($id);

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $game->update(['is_active' => ! $game->is_active]);

        return ApiResponse::success(
            'Game status toggled.',
            ['is_active' => $game->fresh()->is_active],
        );
    }

    /**
     * Toggle game featured status.
     */
    public function toggleFeatured(int $id): JsonResponse
    {
        $game = Game::find($id);

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $game->update(['is_featured' => ! $game->is_featured]);

        return ApiResponse::success(
            'Game featured status toggled.',
            ['is_featured' => $game->fresh()->is_featured],
        );
    }

    /**
     * Delete a game.
     */
    public function destroyGame(int $id): JsonResponse
    {
        $game = Game::find($id);

        if (! $game) {
            return ApiResponse::error('Game not found.', 404);
        }

        $game->delete();

        return ApiResponse::success('Game deleted.');
    }

    /**
     * List all categories with game counts.
     */
    public function categories(): JsonResponse
    {
        $categories = GameCategory::withCount('games')->orderBy('sort_order')->get();

        return ApiResponse::success(
            'Categories retrieved.',
            $categories,
        );
    }

    /**
     * Create a category.
     */
    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100|unique:game_categories,slug',
            'icon' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $category = GameCategory::create($request->only(['name', 'slug', 'icon', 'sort_order']));

        return ApiResponse::success(
            'Category created.',
            $category,
            201,
        );
    }

    /**
     * Update a category.
     */
    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $category = GameCategory::find($id);

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        $request->validate([
            'name' => 'sometimes|string|max:100',
            'slug' => 'sometimes|string|max:100|unique:game_categories,slug,' . $id,
            'icon' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($request->only(['name', 'slug', 'icon', 'sort_order', 'is_active']));

        return ApiResponse::success(
            'Category updated.',
            $category->fresh(),
        );
    }

    /**
     * Delete a category.
     */
    public function destroyCategory(int $id): JsonResponse
    {
        $category = GameCategory::find($id);

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        if ($category->games()->count() > 0) {
            return ApiResponse::error('Cannot delete category with games. Reassign games first.', 400);
        }

        $category->delete();

        return ApiResponse::success('Category deleted.');
    }
}
