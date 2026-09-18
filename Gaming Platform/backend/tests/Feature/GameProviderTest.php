<?php

use App\Models\Game;
use App\Models\GameCategory;
use App\Models\GameProvider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

function createAdmin(): User
{
    $user = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $user->assignRole('admin');

    return $user;
}

function createPlayer(): User
{
    return User::factory()->create();
}

function createProvider(array $overrides = []): GameProvider
{
    return GameProvider::create(array_merge([
        'name' => 'Test Provider',
        'slug' => 'test-provider',
        'base_url' => 'https://test.example.com',
        'is_active' => true,
        'supported_game_types' => ['slots', 'table_games'],
        'min_bet' => 0.1,
        'max_bet' => 1000,
        'sort_order' => 0,
    ], $overrides));
}

function createCategory(array $overrides = []): GameCategory
{
    return GameCategory::create(array_merge([
        'name' => 'Slots',
        'slug' => 'slots',
        'description' => 'Slot games',
        'sort_order' => 0,
    ], $overrides));
}

function createGame(GameProvider $provider, ?GameCategory $category = null, array $overrides = []): Game
{
    return Game::create(array_merge([
        'provider_id' => $provider->id,
        'category_id' => $category?->id,
        'name' => 'Test Game',
        'slug' => 'test-game',
        'external_game_id' => 'ext-001',
        'game_type' => 'slots',
        'is_active' => true,
        'has_demo' => true,
        'is_featured' => false,
        'sort_order' => 0,
    ], $overrides));
}

/*
|--------------------------------------------------------------------------
| Provider API Tests (Admin)
|--------------------------------------------------------------------------
*/

it('allows admin to list providers', function () {
    $admin = createAdmin();
    createProvider(['name' => 'Provider A']);
    createProvider(['name' => 'Provider B', 'slug' => 'provider-b']);

    $response = getJson('/api/v1/admin/providers', [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(2, 'data');
});

it('rejects non-admin from listing providers', function () {
    $player = createPlayer();

    $response = getJson('/api/v1/admin/providers', [
        'Authorization' => 'Bearer '.$player->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403);
});

it('allows admin to create a provider', function () {
    $admin = createAdmin();

    $response = postJson('/api/v1/admin/providers', [
        'name' => 'New Provider',
        'slug' => 'new-provider',
        'base_url' => 'https://new.example.com',
        'supported_game_types' => ['slots'],
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.slug', 'new-provider');

    expect(GameProvider::where('slug', 'new-provider')->exists())->toBeTrue();
});

it('rejects creating provider with duplicate slug', function () {
    $admin = createAdmin();
    createProvider(['slug' => 'dupe-slug']);

    $response = postJson('/api/v1/admin/providers', [
        'name' => 'Dupe',
        'slug' => 'dupe-slug',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(400)
        ->assertJsonPath('success', false);
});

it('allows admin to show a provider', function () {
    $admin = createAdmin();
    $provider = createProvider();

    $response = getJson('/api/v1/admin/providers/'.$provider->id, [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.id', $provider->id);
});

it('returns 404 for non-existent provider', function () {
    $admin = createAdmin();

    $response = getJson('/api/v1/admin/providers/99999', [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(404);
});

it('allows admin to update a provider', function () {
    $admin = createAdmin();
    $provider = createProvider();

    $response = putJson('/api/v1/admin/providers/'.$provider->id, [
        'name' => 'Updated Provider',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Updated Provider');

    expect($provider->fresh()->name)->toBe('Updated Provider');
});

/*
|--------------------------------------------------------------------------
| Game API Tests (Public + Admin)
|--------------------------------------------------------------------------
*/

it('allows public to list games', function () {
    $provider = createProvider();
    createGame($provider, null, ['name' => 'Game A']);
    createGame($provider, null, ['name' => 'Game B', 'slug' => 'game-b', 'external_game_id' => 'ext-002']);

    $response = getJson('/api/v1/games');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(2, 'data');
});

it('filters games by provider', function () {
    $providerA = createProvider(['slug' => 'provider-a']);
    $providerB = createProvider(['slug' => 'provider-b', 'name' => 'Provider B']);
    createGame($providerA, null, ['name' => 'Game A1']);
    createGame($providerA, null, ['name' => 'Game A2', 'slug' => 'game-a2', 'external_game_id' => 'ext-a2']);
    createGame($providerB, null, ['name' => 'Game B1', 'slug' => 'game-b1', 'external_game_id' => 'ext-b1']);

    $response = getJson('/api/v1/games?provider_id='.$providerA->id);

    $response->assertOk()
        ->assertJsonCount(2, 'data');
});

it('filters games by game_type', function () {
    $provider = createProvider();
    createGame($provider, null, ['name' => 'Slots Game', 'game_type' => 'slots']);
    createGame($provider, null, ['name' => 'Table Game', 'slug' => 'table-game', 'external_game_id' => 'ext-t', 'game_type' => 'table_games']);

    $response = getJson('/api/v1/games?game_type=slots');

    $response->assertOk()
        ->assertJsonCount(1, 'data');
});

it('allows public to show a game', function () {
    $provider = createProvider();
    $game = createGame($provider);

    $response = getJson('/api/v1/games/'.$game->id);

    $response->assertOk()
        ->assertJsonPath('data.id', $game->id)
        ->assertJsonPath('data.name', 'Test Game');
});

it('returns 404 for non-existent game', function () {
    $response = getJson('/api/v1/games/99999');

    $response->assertStatus(404);
});

it('allows admin to create a game', function () {
    $admin = createAdmin();
    $provider = createProvider();
    $category = createCategory();

    $response = postJson('/api/v1/admin/games', [
        'provider_id' => $provider->id,
        'category_id' => $category->id,
        'name' => 'New Game',
        'slug' => 'new-game',
        'external_game_id' => 'new-ext-001',
        'game_type' => 'slots',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Game');

    expect(Game::where('slug', 'new-game')->exists())->toBeTrue();
});

it('rejects creating game with duplicate external_game_id for same provider', function () {
    $admin = createAdmin();
    $provider = createProvider();
    createGame($provider, null, ['external_game_id' => 'dup-ext']);

    $response = postJson('/api/v1/admin/games', [
        'provider_id' => $provider->id,
        'name' => 'Dup Game',
        'slug' => 'dup-game',
        'external_game_id' => 'dup-ext',
        'game_type' => 'slots',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(400)
        ->assertJsonPath('success', false);
});

it('allows admin to update a game', function () {
    $admin = createAdmin();
    $provider = createProvider();
    $game = createGame($provider);

    $response = putJson('/api/v1/admin/games/'.$game->id, [
        'name' => 'Updated Game',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Updated Game');

    expect($game->fresh()->name)->toBe('Updated Game');
});

/*
|--------------------------------------------------------------------------
| Category API Tests
|--------------------------------------------------------------------------
*/

it('allows public to list categories', function () {
    createCategory(['name' => 'Slots', 'slug' => 'slots']);
    createCategory(['name' => 'Table Games', 'slug' => 'table-games']);

    $response = getJson('/api/v1/categories');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(2, 'data');
});

it('allows admin to create a category', function () {
    $admin = createAdmin();

    $response = postJson('/api/v1/admin/categories', [
        'name' => 'Crash Games',
        'slug' => 'crash-games',
        'description' => 'Fast-paced crash games',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.slug', 'crash-games');

    expect(GameCategory::where('slug', 'crash-games')->exists())->toBeTrue();
});

it('rejects creating category with duplicate slug', function () {
    $admin = createAdmin();
    createCategory(['slug' => 'dupe']);

    $response = postJson('/api/v1/admin/categories', [
        'name' => 'Dupe',
        'slug' => 'dupe',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Game Launch Tests (Authenticated)
|--------------------------------------------------------------------------
*/

it('requires authentication to launch a game', function () {
    $provider = createProvider();
    $game = createGame($provider);

    $response = postJson('/api/v1/games/launch', [
        'game_id' => $game->id,
    ]);

    $response->assertStatus(401);
});

it('rejects launching a game that does not exist', function () {
    $player = createPlayer();

    $response = postJson('/api/v1/games/launch', [
        'game_id' => 99999,
    ], [
        'Authorization' => 'Bearer '.$player->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects launching an inactive game', function () {
    $player = createPlayer();
    $provider = createProvider();
    $game = createGame($provider, null, ['is_active' => false]);

    $response = postJson('/api/v1/games/launch', [
        'game_id' => $game->id,
    ], [
        'Authorization' => 'Bearer '.$player->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(400);
});

it('allows authenticated user to launch an active game', function () {
    $player = createPlayer();
    $provider = createProvider();
    $game = createGame($provider);

    // Register a mock adapter
    $adapter = new class implements \App\Contracts\Providers\GameProviderInterface {
        public function getSlug(): string
        {
            return 'test-provider';
        }

        public function listGames(): array
        {
            return [];
        }

        public function getGame(string $externalGameId): ?array
        {
            return null;
        }

        public function createSession(\App\Models\Game $game, \App\Models\User $user): array
        {
            return ['external_session_id' => 'sess-123'];
        }

        public function launchGame(\App\Models\Game $game, \App\Models\User $user, bool $demo = false): array
        {
            return ['url' => 'https://example.com/play'];
        }

        public function handleCallback(array $payload): array
        {
            return ['status' => 'ok'];
        }

        public function verifyCallbackSignature(array $payload, string $signature): bool
        {
            return true;
        }
    };

    $service = app(\App\Services\GameProviderService::class);
    $service->register($adapter);
    app()->instance(\App\Services\GameProviderService::class, $service);

    $response = postJson('/api/v1/games/launch', [
        'game_id' => $game->id,
        'demo' => true,
    ], [
        'Authorization' => 'Bearer '.$player->createToken('test')->plainTextToken,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true);
});

/*
|--------------------------------------------------------------------------
| User Wallet Tests (Authenticated)
|--------------------------------------------------------------------------
*/

it('allows authenticated user to view wallet', function () {
    $player = createPlayer();

    $response = getJson('/api/v1/wallet/', [
        'Authorization' => 'Bearer '.$player->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('requires authentication to view wallet', function () {
    $response = getJson('/api/v1/wallet/');

    $response->assertStatus(401);
});

/*
|--------------------------------------------------------------------------
| Provider Game Sync Tests (Service Level)
|--------------------------------------------------------------------------
*/

it('syncs games from external provider', function () {
    $provider = createProvider();

    // Create a mock adapter
    $adapter = new class implements \App\Contracts\Providers\GameProviderInterface {
        public function getSlug(): string
        {
            return 'test-provider';
        }

        public function listGames(): array
        {
            return [
                ['name' => 'Synced Game 1', 'external_game_id' => 'sync-001', 'game_type' => 'slots'],
                ['name' => 'Synced Game 2', 'external_game_id' => 'sync-002', 'game_type' => 'table_games'],
            ];
        }

        public function getGame(string $externalGameId): ?array
        {
            return null;
        }

        public function createSession(\App\Models\Game $game, \App\Models\User $user): array
        {
            return ['external_session_id' => 'sess-123'];
        }

        public function launchGame(\App\Models\Game $game, \App\Models\User $user, bool $demo = false): array
        {
            return ['url' => 'https://example.com/play'];
        }

        public function handleCallback(array $payload): array
        {
            return ['status' => 'ok'];
        }

        public function verifyCallbackSignature(array $payload, string $signature): bool
        {
            return true;
        }
    };

    $service = new \App\Services\GameProviderService();
    $service->register($adapter);

    $result = $service->syncGamesFromProvider($provider);

    expect($result['created'])->toBe(2)
        ->and($result['total'])->toBe(2);

    expect(Game::where('provider_id', $provider->id)->count())->toBe(2);
});

/*
|--------------------------------------------------------------------------
| Provider Validation Tests
|--------------------------------------------------------------------------
*/

it('validates provider store request', function () {
    $admin = createAdmin();

    $response = postJson('/api/v1/admin/providers', [
        'name' => '',
        'slug' => '',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['success', 'message', 'errors']);
});

it('validates game store request', function () {
    $admin = createAdmin();

    $response = postJson('/api/v1/admin/games', [
        'name' => '',
        'slug' => '',
        'external_game_id' => '',
        'game_type' => 'invalid_type',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['success', 'message', 'errors']);
});

it('validates category store request', function () {
    $admin = createAdmin();

    $response = postJson('/api/v1/admin/categories', [
        'name' => '',
        'slug' => '',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['success', 'message', 'errors']);
});
