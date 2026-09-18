<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Registration Tests
|--------------------------------------------------------------------------
*/

it('registers a new player and returns an api token', function () {
    $response = postJson('/api/v1/auth/register', [
        'name' => 'Alice Player',
        'email' => 'alice@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => ['user', 'token', 'token_type'],
        ]);

    expect(User::where('email', 'alice@example.com')->exists())->toBeTrue();
});

it('creates the user with active status and unverified kyc', function () {
    postJson('/api/v1/auth/register', [
        'name' => 'Bob Player',
        'email' => 'bob@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertCreated();

    $user = User::where('email', 'bob@example.com')->first();
    expect($user->status)->toBe(User::STATUS_ACTIVE)
        ->and($user->kyc_status)->toBe(User::KYC_UNVERIFIED);
});

it('rejects registration with a duplicate email', function () {
    User::factory()->create(['email' => 'dupe@example.com']);

    $response = postJson('/api/v1/auth/register', [
        'name' => 'Dupe',
        'email' => 'dupe@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects registration with invalid data', function () {
    $response = postJson('/api/v1/auth/register', [
        'name' => '',
        'email' => 'not-an-email',
        'password' => 'short',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['success', 'message', 'errors']);
});

it('rejects registration without password confirmation', function () {
    $response = postJson('/api/v1/auth/register', [
        'name' => 'Test',
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Login Tests
|--------------------------------------------------------------------------
*/

it('logs a user in and returns a token', function () {
    User::factory()->create([
        'email' => 'login@example.com',
        'password' => bcrypt('secret123'),
    ]);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure(['data' => ['token', 'token_type']]);
});

it('returns user data on successful login', function () {
    User::factory()->create([
        'email' => 'login2@example.com',
        'password' => bcrypt('secret123'),
    ]);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'login2@example.com',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.user.email', 'login2@example.com')
        ->assertJsonPath('data.token_type', 'Bearer');
});

it('rejects login with invalid credentials', function () {
    User::factory()->create([
        'email' => 'wrong@example.com',
        'password' => bcrypt('secret123'),
    ]);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'wrong@example.com',
        'password' => 'not-the-right-password',
    ]);

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

it('rejects login with non-existent email', function () {
    $response = postJson('/api/v1/auth/login', [
        'email' => 'nonexistent@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

it('rejects login with missing fields', function () {
    $response = postJson('/api/v1/auth/login', [
        'email' => '',
        'password' => '',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Logout Tests
|--------------------------------------------------------------------------
*/

it('logs the user out', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $response = postJson('/api/v1/auth/logout', [], [
        'Authorization' => 'Bearer '.$token,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect($user->tokens()->count())->toBe(0);
});

it('rejects logout without a token', function () {
    $response = postJson('/api/v1/auth/logout');

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Me Endpoint Tests
|--------------------------------------------------------------------------
*/

it('returns the authenticated user on /me', function () {
    $user = User::factory()->create();

    $response = getJson('/api/v1/auth/me', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email);
});

it('rejects /me without a token', function () {
    $response = getJson('/api/v1/auth/me');

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Ping Probe
|--------------------------------------------------------------------------
*/

it('responds to the api ping probe', function () {
    $response = getJson('/api/v1/ping');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'pong');
});
