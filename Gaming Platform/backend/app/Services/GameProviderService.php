<?php

namespace App\Services;

use App\Contracts\Providers\GameProviderInterface;
use App\Exceptions\ApiException;
use App\Models\Game;
use App\Models\GameCategory;
use App\Models\GameProvider;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * GameProviderService orchestrates all game-provider operations.
 *
 * Controllers depend on this service — never on adapter classes directly.
 * The service resolves the correct adapter at runtime from the registry.
 */
class GameProviderService
{
    /**
     * @var array<string, GameProviderInterface> Registered adapters.
     */
    private array $adapters = [];

    /**
     * Register a provider adapter.
     */
    public function register(GameProviderInterface $adapter): void
    {
        $this->adapters[$adapter->getSlug()] = $adapter;
    }

    /**
     * Get the adapter for a given provider model.
     */
    public function getAdapter(GameProvider $provider): GameProviderInterface
    {
        if (! isset($this->adapters[$provider->slug])) {
            throw ApiException::badRequest(
                "No adapter registered for provider [{$provider->slug}]."
            );
        }

        return $this->adapters[$provider->slug];
    }

    /*
    |--------------------------------------------------------------------------
    | Provider CRUD
    |--------------------------------------------------------------------------
    */

    /**
     * Create a new game provider.
     */
    public function createProvider(array $input): GameProvider
    {
        if (GameProvider::where('slug', $input['slug'])->exists()) {
            throw ApiException::badRequest('A provider with this slug already exists.');
        }

        return GameProvider::create($input);
    }

    /**
     * Update a game provider.
     */
    public function updateProvider(GameProvider $provider, array $input): GameProvider
    {
        $provider->update($input);

        return $provider->fresh();
    }

    /**
     * List all providers.
     */
    public function listProviders(int $perPage = 15): \Illuminate\Contracts\Pagination\Paginator
    {
        return GameProvider::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage);
    }

    /*
    |--------------------------------------------------------------------------
    | Category CRUD
    |--------------------------------------------------------------------------
    */

    /**
     * Create a game category.
     */
    public function createCategory(array $input): GameCategory
    {
        if (GameCategory::where('slug', $input['slug'])->exists()) {
            throw ApiException::badRequest('A category with this slug already exists.');
        }

        return GameCategory::create($input);
    }

    /**
     * List all categories.
     */
    public function listCategories(int $perPage = 15): \Illuminate\Contracts\Pagination\Paginator
    {
        return GameCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage);
    }

    /*
    |--------------------------------------------------------------------------
    | Game CRUD
    |--------------------------------------------------------------------------
    */

    /**
     * Create a game under a provider.
     */
    public function createGame(GameProvider $provider, array $input): Game
    {
        if ($provider->games()->where('external_game_id', $input['external_game_id'])->exists()) {
            throw ApiException::badRequest(
                'A game with this external_game_id already exists for this provider.'
            );
        }

        $input['provider_id'] = $provider->id;

        return Game::create($input);
    }

    /**
     * Update a game.
     */
    public function updateGame(Game $game, array $input): Game
    {
        $game->update($input);

        return $game->fresh();
    }

    /**
     * List games with optional filters.
     */
    public function listGames(
        ?int $providerId = null,
        ?int $categoryId = null,
        ?string $gameType = null,
        bool $featuredOnly = false,
        int $perPage = 15,
    ): \Illuminate\Contracts\Pagination\Paginator {
        $query = Game::query()
            ->with(['provider', 'category'])
            ->orderBy('sort_order');

        if ($providerId !== null) {
            $query->where('provider_id', $providerId);
        }

        if ($categoryId !== null) {
            $query->where('category_id', $categoryId);
        }

        if ($gameType !== null) {
            $query->where('game_type', $gameType);
        }

        if ($featuredOnly) {
            $query->where('is_featured', true);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get a single game by ID.
     */
    public function getGame(int $gameId): Game
    {
        $game = Game::with(['provider', 'category'])->find($gameId);

        if (! $game) {
            throw ApiException::notFound('Game not found.');
        }

        return $game;
    }

    /*
    |--------------------------------------------------------------------------
    | Provider Sync
    |--------------------------------------------------------------------------
    */

    /**
     * Sync games from an external provider.
     *
     * Fetches the game list from the adapter and upserts into the local DB.
     */
    public function syncGamesFromProvider(GameProvider $provider): array
    {
        $adapter = $this->getAdapter($provider);

        $externalGames = $adapter->listGames();

        $created = 0;
        $updated = 0;

        foreach ($externalGames as $ext) {
            $existing = $provider->games()
                ->where('external_game_id', $ext['external_game_id'])
                ->first();

            if ($existing) {
                $existing->update([
                    'name' => $ext['name'],
                    'game_type' => $ext['game_type'] ?? $existing->game_type,
                    'thumbnail_url' => $ext['thumbnail_url'] ?? $existing->thumbnail_url,
                    'description' => $ext['description'] ?? $existing->description,
                    'metadata' => $ext['metadata'] ?? $existing->metadata,
                    'is_active' => $ext['is_active'] ?? $existing->is_active,
                    'has_demo' => $ext['has_demo'] ?? $existing->has_demo,
                ]);
                $updated++;
            } else {
                $provider->games()->create([
                    'name' => $ext['name'],
                    'slug' => $this->generateSlug($ext['name'], $provider->slug),
                    'external_game_id' => $ext['external_game_id'],
                    'game_type' => $ext['game_type'] ?? 'slots',
                    'thumbnail_url' => $ext['thumbnail_url'] ?? null,
                    'description' => $ext['description'] ?? null,
                    'metadata' => $ext['metadata'] ?? null,
                    'is_active' => $ext['is_active'] ?? true,
                    'has_demo' => $ext['has_demo'] ?? false,
                ]);
                $created++;
            }
        }

        return ['created' => $created, 'updated' => $updated, 'total' => count($externalGames)];
    }

    /*
    |--------------------------------------------------------------------------
    | Session Management
    |--------------------------------------------------------------------------
    */

    /**
     * Launch a game — creates a session and returns launch data.
     */
    public function launchGame(Game $game, User $user, bool $demo = false): array
    {
        if (! $game->isActive()) {
            throw ApiException::badRequest('This game is not currently available.');
        }

        if (! $game->provider->isActive()) {
            throw ApiException::badRequest('This game provider is not currently available.');
        }

        $adapter = $this->getAdapter($game->provider);

        // Create session with provider
        $providerSession = $adapter->createSession($game, $user);

        // Create local session record
        $session = GameSession::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'provider_id' => $game->provider_id,
            'external_session_id' => $providerSession['external_session_id'],
            'status' => GameSession::STATUS_ACTIVE,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // Get launch data
        $launchData = $adapter->launchGame($game, $user, $demo);

        $session->update(['launch_data' => $launchData]);

        return [
            'session' => $session,
            'launch_url' => $launchData['url'] ?? null,
            'session_token' => $launchData['session_token'] ?? null,
            'extra' => $launchData['extra'] ?? null,
        ];
    }

    /**
     * End a game session.
     */
    public function endSession(GameSession $session): GameSession
    {
        $session->update([
            'status' => GameSession::STATUS_ENDED,
            'ended_at' => now(),
        ]);

        return $session->fresh();
    }

    /**
     * Handle a provider callback.
     */
    public function handleCallback(GameProvider $provider, array $payload): array
    {
        $adapter = $this->getAdapter($provider);

        if (isset($payload['signature'])) {
            $valid = $adapter->verifyCallbackSignature($payload, $payload['signature']);
            if (! $valid) {
                throw ApiException::unauthorized('Invalid callback signature.');
            }
        }

        return $adapter->handleCallback($payload);
    }

    /**
     * Get active sessions for a user.
     */
    public function getUserSessions(User $user, int $perPage = 15): \Illuminate\Contracts\Pagination\Paginator
    {
        return GameSession::where('user_id', $user->id)
            ->with(['game', 'provider'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    private function generateSlug(string $name, string $providerSlug): string
    {
        $slug = \Illuminate\Support\Str::slug($name);
        $base = $slug;
        $counter = 1;

        while (Game::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}
