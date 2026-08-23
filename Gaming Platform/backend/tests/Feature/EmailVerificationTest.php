<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Send Verification Email
|--------------------------------------------------------------------------
*/

it('sends verification email for unverified user', function () {
    $user = User::factory()->unverified()->create();

    $response = postJson('/api/v1/email/verify/send', [], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('returns success for already verified user', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = postJson('/api/v1/email/verify/send', [], [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Email is already verified.');
});

it('rejects send verification without a token', function () {
    $response = postJson('/api/v1/email/verify/send');

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/

it('verifies email with valid hash', function () {
    $user = User::factory()->unverified()->create();
    $hash = sha1($user->getEmailForVerification());

    $response = postJson('/api/v1/email/verify', [
        'id' => $user->id,
        'hash' => $hash,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Email verified successfully.');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('rejects verification with invalid hash', function () {
    $user = User::factory()->unverified()->create();

    $response = postJson('/api/v1/email/verify', [
        'id' => $user->id,
        'hash' => 'invalid-hash',
    ]);

    $response->assertStatus(404)
        ->assertJsonPath('success', false);
});

it('rejects verification with non-existent user', function () {
    $response = postJson('/api/v1/email/verify', [
        'id' => 99999,
        'hash' => 'some-hash',
    ]);

    $response->assertStatus(404)
        ->assertJsonPath('success', false);
});

it('returns success for already verified email on verify', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $hash = sha1($user->getEmailForVerification());

    $response = postJson('/api/v1/email/verify', [
        'id' => $user->id,
        'hash' => $hash,
    ]);

    $response->assertOk()
        ->assertJsonPath('message', 'Email is already verified.');
});

it('rejects verification with missing fields', function () {
    $response = postJson('/api/v1/email/verify', []);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});
