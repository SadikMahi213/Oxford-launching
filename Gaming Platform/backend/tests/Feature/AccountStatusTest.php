<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Account Status — Suspended Users
|--------------------------------------------------------------------------
*/

it('blocks suspended user from accessing profile', function () {
    $user = User::factory()->suspended()->create();

    $response = getJson('/api/v1/profile', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonFragment(['message' => 'Your account is suspended. Please contact support.']);
});

it('blocks suspended user from changing password', function () {
    $user = User::factory()->suspended()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'oldpassword',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Account Status — Banned Users
|--------------------------------------------------------------------------
*/

it('blocks banned user from accessing profile', function () {
    $user = User::factory()->banned()->create();

    $response = getJson('/api/v1/profile', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonFragment(['message' => 'Your account is banned. Please contact support.']);
});

it('blocks banned user from logout', function () {
    $user = User::factory()->banned()->create();

    $response = postJson('/api/v1/auth/logout', [], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Account Status — Active Users
|--------------------------------------------------------------------------
*/

it('allows active user to access profile', function () {
    $user = User::factory()->active()->create();

    $response = getJson('/api/v1/profile', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

/*
|--------------------------------------------------------------------------
| Login with Suspended/Banned Account
|--------------------------------------------------------------------------
*/

it('rejects login for suspended account', function () {
    User::factory()->suspended()->create([
        'email' => 'suspended@example.com',
        'password' => bcrypt('password123'),
    ]);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'suspended@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonFragment(['message' => 'This account is not active.']);
});

it('rejects login for banned account', function () {
    User::factory()->banned()->create([
        'email' => 'banned@example.com',
        'password' => bcrypt('password123'),
    ]);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'banned@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonFragment(['message' => 'This account is not active.']);
});
