<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->auth->register($request->validated());

        $token = $this->auth->createToken($user, $request->input('device_name', 'api-token'));

        return ApiResponse::success(
            'Registration successful.',
            [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
            201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->auth->authenticate($request->validated());

        $token = $this->auth->createToken($user, $request->input('device_name', 'api-token'));

        return ApiResponse::success(
            'Login successful.',
            [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ]
        );
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->auth->logout($user);

        return ApiResponse::success('Logged out successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return ApiResponse::success(
            'Authenticated user retrieved.',
            new UserResource($user->load('roles'))
        );
    }
}
