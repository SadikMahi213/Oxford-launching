<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function __construct(
        private readonly UserRepository $users
    ) {}

    /**
     * List all users (admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $this->users->paginate($perPage);

        return ApiResponse::paginated(
            'Users retrieved.',
            $paginator,
            UserResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Show a single user (admin only).
     */
    public function show(int $id): JsonResponse
    {
        $user = $this->users->findById($id);

        if (! $user) {
            return ApiResponse::error('User not found.', 404);
        }

        return ApiResponse::success(
            'User retrieved.',
            new UserResource($user->load('roles')),
        );
    }

    /**
     * Update a user's status (admin only).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'string', 'in:active,suspended,banned'],
        ]);

        $user = $this->users->findById($id);

        if (! $user) {
            return ApiResponse::error('User not found.', 404);
        }

        $user->update(['status' => $request->input('status')]);

        return ApiResponse::success(
            'User status updated.',
            new UserResource($user->fresh()->load('roles')),
        );
    }
}
