<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Admin Authorization - Middleware
|--------------------------------------------------------------------------
*/

it('allows admin to access admin routes', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $response = getJson('/api/v1/admin/users', [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('rejects non-admin from accessing admin routes', function () {
    $user = User::factory()->create();

    $response = getJson('/api/v1/admin/users', [
        'Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonFragment(['message' => 'Admin access required.']);
});

it('rejects unauthenticated access to admin routes', function () {
    $response = getJson('/api/v1/admin/users');

    $response->assertStatus(401)
        ->assertJsonPath('success', false);
});

/*
|--------------------------------------------------------------------------
| Admin User Management
|--------------------------------------------------------------------------
*/

it('admin can list all users', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    User::factory()->count(3)->create();

    $response = getJson('/api/v1/admin/users', [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'success',
            'message',
            'data',
            'meta' => ['pagination'],
        ]);
});

it('admin can show a single user', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $target = User::factory()->create(['name' => 'Target User']);

    $response = getJson('/api/v1/admin/users/'.$target->id, [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Target User');
});

it('admin returns 404 for non-existent user', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $response = getJson('/api/v1/admin/users/99999', [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(404)
        ->assertJsonPath('success', false);
});

it('admin can update user status to suspended', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $target = User::factory()->create();

    $response = putJson('/api/v1/admin/users/'.$target->id.'/status', [
        'status' => 'suspended',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'suspended');

    expect($target->fresh()->status)->toBe('suspended');
});

it('admin can update user status to active', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $target = User::factory()->suspended()->create();

    $response = putJson('/api/v1/admin/users/'.$target->id.'/status', [
        'status' => 'active',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'active');

    expect($target->fresh()->status)->toBe('active');
});

it('admin cannot set invalid status', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('admin', 'web');
    $admin->assignRole('admin');

    $target = User::factory()->create();

    $response = putJson('/api/v1/admin/users/'.$target->id.'/status', [
        'status' => 'invalid_status',
    ], [
        'Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false);
});
