<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Seeds the foundational roles and permissions for the platform.
 *
 * Wallet, payment, and game-provider permissions are intentionally left
 * for later phases — this seeder only establishes the role backbone
 * (player + admin) used by the auth foundation.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles/permissions.
        Artisan::call('permission:cache-reset');

        // Foundational permissions. Additional domain permissions
        // (wallet, payment, game) will be added in later phases.
        $permissions = [
            'access admin panel',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $player = Role::findOrCreate('player', 'web');
        $player->syncPermissions([]);

        $admin = Role::findOrCreate('admin', 'web');
        $admin->syncPermissions($permissions);

        $this->command?->info('Roles and permissions seeded.');
    }
}
