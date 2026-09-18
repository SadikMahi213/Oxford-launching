<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;

/**
 * AuthService holds the business logic for authentication.
 *
 * It is intentionally framework-light: it depends on the UserRepository
 * abstraction (not the Eloquent model) so the persistence layer can be
 * swapped or mocked in tests. Controllers call this service and never
 * perform auth logic directly.
 */
class AuthService
{
    public function __construct(
        private readonly UserRepository $users
    ) {}

    /**
     * Register a new player account.
     */
    public function register(array $input): User
    {
        if ($this->users->findByEmail($input['email']) !== null) {
            throw ApiException::badRequest('A user with this email already exists.');
        }

        return $this->users->create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => Hash::make($input['password']),
            'status' => User::STATUS_ACTIVE,
            'kyc_status' => User::KYC_UNVERIFIED,
        ]);
    }

    /**
     * Validate credentials and return the authenticated user.
     */
    public function authenticate(array $input): User
    {
        $user = $this->users->findByEmail($input['email']);

        if ($user === null || ! Hash::check($input['password'], $user->password)) {
            throw ApiException::unauthorized('Invalid credentials.');
        }

        if ($user->status !== User::STATUS_ACTIVE) {
            throw ApiException::forbidden('This account is not active.');
        }

        return $user;
    }

    /**
     * Issue a new Sanctum API token for the given user.
     */
    public function createToken(User $user, string $deviceName = 'api-token'): string
    {
        return $user->createToken($deviceName)->plainTextToken;
    }

    /**
     * Revoke the current access token (logout).
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}
