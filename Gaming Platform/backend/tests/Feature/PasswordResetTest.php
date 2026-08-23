<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password as PasswordFacade;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

it('sends a password reset link for a valid email', function () {
    User::factory()->create(['email' => 'reset@example.com']);

    $response = postJson('/api/v1/auth/forgot-password', [
        'email' => 'reset@example.com',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('returns success even for non-existent email (prevents user enumeration)', function () {
    $response = postJson('/api/v1/auth/forgot-password', [
        'email' => 'nonexistent@example.com',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('rejects forgot password with invalid email format', function () {
    $response = postJson('/api/v1/auth/forgot-password', [
        'email' => 'not-an-email',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects forgot password with missing email', function () {
    $response = postJson('/api/v1/auth/forgot-password', []);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

it('resets password with a valid token', function () {
    $user = User::factory()->create([
        'email' => 'resettoken@example.com',
        'password' => bcrypt('oldpassword'),
    ]);

    $token = PasswordFacade::createToken($user);

    $response = postJson('/api/v1/auth/reset-password', [
        'email' => 'resettoken@example.com',
        'token' => $token,
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect(Hash::check('newpassword123', $user->fresh()->password))->toBeTrue();
});

it('rejects reset with invalid token', function () {
    User::factory()->create(['email' => 'invalid@example.com']);

    $response = postJson('/api/v1/auth/reset-password', [
        'email' => 'invalid@example.com',
        'token' => 'invalid-token-123',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ]);

    $response->assertStatus(400)
        ->assertJsonPath('success', false);
});

it('rejects reset with mismatched email', function () {
    $user = User::factory()->create(['email' => 'real@example.com']);
    $token = PasswordFacade::createToken($user);

    $response = postJson('/api/v1/auth/reset-password', [
        'email' => 'wrong@example.com',
        'token' => $token,
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ]);

    $response->assertStatus(400)
        ->assertJsonPath('success', false);
});

it('rejects reset with weak password', function () {
    $user = User::factory()->create(['email' => 'weak@example.com']);
    $token = PasswordFacade::createToken($user);

    $response = postJson('/api/v1/auth/reset-password', [
        'email' => 'weak@example.com',
        'token' => $token,
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects reset with missing fields', function () {
    $response = postJson('/api/v1/auth/reset-password', []);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});
