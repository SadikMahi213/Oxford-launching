<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCategoryRequest;
use App\Http\Resources\GameCategoryResource;
use App\Http\Responses\ApiResponse;
use App\Models\GameCategory;
use App\Services\GameProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameCategoryController extends Controller
{
    public function __construct(
        private readonly GameProviderService $service
    ) {}

    /**
     * List all game categories.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $this->service->listCategories($perPage);

        return ApiResponse::paginated(
            'Categories retrieved.',
            $paginator,
            GameCategoryResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Store a new category (admin).
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->service->createCategory($request->validated());

        return ApiResponse::success(
            'Category created.',
            new GameCategoryResource($category),
            201,
        );
    }
}
