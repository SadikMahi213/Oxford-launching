<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly PasswordResetService $passwordReset
    ) {}

    /**
     * Send a password reset link to the user's email.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->passwordReset->createToken($request->input('email'));

        return ApiResponse::success(
            'If an account with that email exists, a password reset link has been sent.',
        );
    }

    /**
     * Reset the user's password using the token from the email.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->passwordReset->resetPassword(
            $request->input('email'),
            $request->input('token'),
            $request->input('password'),
        );

        return ApiResponse::success('Password has been reset successfully.');
    }
}
