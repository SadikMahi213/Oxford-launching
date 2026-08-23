<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProviderRequest;
use App\Http\Requests\Api\V1\UpdateProviderRequest;
use App\Http\Resources\GameProviderResource;
use App\Http\Responses\ApiResponse;
use App\Services\GameProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameProviderController extends Controller
{
    public function __construct(
        private readonly GameProviderService $service
    ) {}

    /**
     * List all game providers.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginator = $this->service->listProviders($perPage);

        return ApiResponse::paginated(
            'Providers retrieved.',
            $paginator,
            GameProviderResource::collection($paginator->getCollection()),
        );
    }

    /**
     * Store a new game provider (admin).
     */
    public function store(StoreProviderRequest $request): JsonResponse
    {
        $provider = $this->service->createProvider($request->validated());

        return ApiResponse::success(
            'Provider created.',
            new GameProviderResource($provider),
            201,
        );
    }

    /**
     * Show a single provider.
     */
    public function show(int $id): JsonResponse
    {
        $provider = \App\Models\GameProvider::find($id);

        if (! $provider) {
            return ApiResponse::error('Provider not found.', 404);
        }

        return ApiResponse::success(
            'Provider retrieved.',
            new GameProviderResource($provider->load('games')),
        );
    }

    /**
     * Update a provider (admin).
     */
    public function update(UpdateProviderRequest $request, int $id): JsonResponse
    {
        $provider = \App\Models\GameProvider::find($id);

        if (! $provider) {
            return ApiResponse::error('Provider not found.', 404);
        }

        $updated = $this->service->updateProvider($provider, $request->validated());

        return ApiResponse::success(
            'Provider updated.',
            new GameProviderResource($updated),
        );
    }
}
