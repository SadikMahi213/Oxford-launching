<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Profile Retrieval
|--------------------------------------------------------------------------
*/

it('returns the authenticated user profile', function () {
    $user = User::factory()->create(['name' => 'Profile User']);

    $response = getJson('/api/v1/profile', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Profile User')
        ->assertJsonPath('data.email', $user->email);
});

it('rejects profile request without a token', function () {
    $response = getJson('/api/v1/profile');

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Profile Update
|--------------------------------------------------------------------------
*/

it('updates the user name', function () {
    $user = User::factory()->create(['name' => 'Old Name']);

    $response = putJson('/api/v1/profile', [
        'name' => 'New Name',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Name');

    expect($user->fresh()->name)->toBe('New Name');
});

it('updates the user email and resets verification', function () {
    $user = User::factory()->create([
        'email' => 'old@example.com',
        'email_verified_at' => now(),
    ]);

    $response = putJson('/api/v1/profile', [
        'email' => 'new@example.com',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.email', 'new@example.com');

    $fresh = $user->fresh();
    expect($fresh->email)->toBe('new@example.com')
        ->and($fresh->email_verified_at)->toBeNull();
});

it('rejects profile update with duplicate email', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create(['email' => 'mine@example.com']);

    $response = putJson('/api/v1/profile', [
        'email' => 'taken@example.com',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects profile update without a token', function () {
    $response = putJson('/api/v1/profile', ['name' => 'Hacker']);

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Password Change
|--------------------------------------------------------------------------
*/

it('changes the user password successfully', function () {
    $user = User::factory()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'oldpassword',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    expect(Hash::check('newpassword123', $user->fresh()->password))->toBeTrue();
});

it('rejects password change with wrong current password', function () {
    $user = User::factory()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'wrongpassword',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(400)
        ->assertJsonPath('success', false);
});

it('rejects password change with mismatched confirmation', function () {
    $user = User::factory()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'oldpassword',
        'password' => 'newpassword123',
        'password_confirmation' => 'differentpassword',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects password change with short password', function () {
    $user = User::factory()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'oldpassword',
        'password' => 'short',
        'password_confirmation' => 'short',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects password change with same as current password', function () {
    $user = User::factory()->create([
        'password' => bcrypt('samepassword'),
    ]);

    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'samepassword',
        'password' => 'samepassword',
        'password_confirmation' => 'samepassword',
    ], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('rejects password change without a token', function () {
    $response = putJson('/api/v1/profile/password', [
        'current_password' => 'old',
        'password' => 'new',
        'password_confirmation' => 'new',
    ]);

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});
