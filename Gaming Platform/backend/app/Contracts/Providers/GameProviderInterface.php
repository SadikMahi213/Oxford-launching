<?php

namespace App\Contracts\Providers;

use App\Models\Game;
use App\Models\GameProvider;
use App\Models\User;

/**
 * Contract for game-provider adapters.
 *
 * Every third-party provider (Pragmatic, Evolution, etc.) must implement
 * this interface. The service layer depends ONLY on this contract — never
 * on a concrete adapter class.
 *
 * No provider-specific logic lives in controllers or services.
 */
interface GameProviderInterface
{
    /**
     * Return the unique slug identifying this provider.
     */
    public function getSlug(): string;

    /**
     * List all games available from this provider.
     *
     * @return array<int, array{
     *     external_game_id: string,
     *     name: string,
     *     game_type: string,
     *     thumbnail_url: string|null,
     *     description: string|null,
     *     metadata: array<string, mixed>|null,
     *     is_active: bool,
     *     has_demo: bool,
     * }>
     */
    public function listGames(): array;

    /**
     * Get a single game by its external ID.
     *
     * @return array{
     *     external_game_id: string,
     *     name: string,
     *     game_type: string,
     *     thumbnail_url: string|null,
     *     description: string|null,
     *     metadata: array<string, mixed>|null,
     *     is_active: bool,
     *     has_demo: bool,
     * }|null
     */
    public function getGame(string $externalGameId): ?array;

    /**
     * Generate a launch URL / payload for the given game and user.
     *
     * @return array{
     *     url: string,
     *     session_token: string|null,
     *     extra: array<string, mixed>|null,
     * }
     */
    public function launchGame(Game $game, User $user, bool $demo = false): array;

    /**
     * Create a game session record with the provider.
     *
     * @return array{
     *     external_session_id: string,
     *     status: string,
     * }
     */
    public function createSession(Game $game, User $user): array;

    /**
     * Handle a provider callback (bet, win, refund, etc.).
     *
     * Returns a normalized structure that the service layer can interpret.
     *
     * @param  array<string, mixed>  $payload
     * @return array{
     *     action: string,
     *     amount: string,
     *     reference: string,
     *     external_session_id: string|null,
     *     metadata: array<string, mixed>|null,
     * }
     */
    public function handleCallback(array $payload): array;

    /**
     * Verify the signature of an incoming callback.
     */
    public function verifyCallbackSignature(array $payload, string $signature): bool;
}
