<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * PasswordResetService handles the password reset token lifecycle:
 * creating tokens, validating them, and resetting the password.
 *
 * Uses Laravel's built-in Password facade for token management,
 * which stores tokens in the password_reset_tokens table.
 */
class PasswordResetService
{
    /**
     * Create a password reset token for the given email.
     *
     * Always returns success (to prevent user enumeration) but only
     * sends the email if the user actually exists.
     */
    public function createToken(string $email): void
    {
        // Use Laravel's built-in broker to create the token.
        // If the user doesn't exist, this will fail silently.
        $status = Password::broker()->sendResetLink(
            ['email' => $email],
            function (User $user, string $token) {
                // In production, send the token via email.
                // For now, we log it for development/testing.
                logger()->info('Password reset token created', [
                    'email' => $user->email,
                    'token' => $token,
                ]);
            }
        );

        // Always return success to prevent user enumeration.
        // The broker returns a status string, not a boolean.
        if ($status !== Password::RESET_LINK_SENT) {
            // Still log it, but don't reveal the failure to the client.
            logger()->warning('Password reset token creation failed', [
                'email' => $email,
                'status' => $status,
            ]);
        }
    }

    /**
     * Validate a password reset token and reset the user's password.
     */
    public function resetPassword(string $email, string $token, string $password): void
    {
        $status = Password::broker()->reset(
            ['email' => $email, 'token' => $token, 'password' => $password],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => bcrypt($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ApiException::badRequest('Invalid or expired reset token.');
        }
    }
}
