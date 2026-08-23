<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * ProfileService handles user profile operations:
 * updating profile information and changing passwords.
 */
class ProfileService
{
    /**
     * Update the user's profile information.
     */
    public function updateProfile(User $user, array $input): User
    {
        if (isset($input['email']) && $input['email'] !== $user->email) {
            // If email is changing, reset verification status
            $user->forceFill([
                'name' => $input['name'] ?? $user->name,
                'email' => $input['email'],
                'email_verified_at' => null,
            ])->save();
        } else {
            $user->update(collect($input)->only(['name'])->toArray());
        }

        return $user->fresh();
    }

    /**
     * Change the user's password after verifying the current password.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ApiException::badRequest('The current password is incorrect.');
        }

        $user->forceFill([
            'password' => bcrypt($newPassword),
        ])->save();
    }
}
