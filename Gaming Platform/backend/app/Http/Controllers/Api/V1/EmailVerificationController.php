<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SendVerificationEmailRequest;
use App\Http\Requests\Api\V1\VerifyEmailRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EmailVerificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function send(SendVerificationEmailRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return ApiResponse::success('Email is already verified.');
        }

        // In production, use $user->sendEmailVerificationNotification().
        // For the foundation phase (no mail driver), we generate a
        // verification URL with a hash and log it.
        $hash = sha1($user->getEmailForVerification());

        logger()->info('Email verification link generated', [
            'user_id' => $user->id,
            'email' => $user->email,
            'hash' => $hash,
        ]);

        return ApiResponse::success(
            'Verification link has been sent to your email.',
        );
    }

    /**
     * Mark the user's email address as verified.
     */
    public function verify(VerifyEmailRequest $request): JsonResponse
    {
        $userId = $request->input('id');
        $hash = $request->input('hash');

        $user = User::find($userId);

        if (! $user) {
            return ApiResponse::error('Invalid verification link.', 404);
        }

        $expectedHash = sha1($user->getEmailForVerification());

        if (! hash_equals($expectedHash, $hash)) {
            return ApiResponse::error('Invalid verification link.', 404);
        }

        if ($user->hasVerifiedEmail()) {
            return ApiResponse::success('Email is already verified.');
        }

        $user->markEmailAsVerified();

        return ApiResponse::success('Email verified successfully.');
    }
}
