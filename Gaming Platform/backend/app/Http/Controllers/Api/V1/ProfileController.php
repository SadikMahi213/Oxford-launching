<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ChangePasswordRequest;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profile
    ) {}

    /**
     * Get the authenticated user's profile.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return ApiResponse::success(
            'Profile retrieved.',
            new UserResource($user->load('roles')),
        );
    }

    /**
     * Update the authenticated user's profile information.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $updated = $this->profile->updateProfile($user, $request->validated());

        return ApiResponse::success(
            'Profile updated.',
            new UserResource($updated->load('roles')),
        );
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->profile->changePassword(
            $user,
            $request->input('current_password'),
            $request->input('password'),
        );

        return ApiResponse::success('Password changed successfully.');
    }
}
