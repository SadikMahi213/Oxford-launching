<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\AbstractPaginator;
use Symfony\Component\HttpFoundation\Response;

/**
 * Centralized API response envelope.
 *
 * Every API response follows the same shape:
 * {
 *   "success": bool,
 *   "message": string,
 *   "data": mixed,
 *   "errors": mixed,
 *   "meta": mixed
 * }
 */
class ApiResponse
{
    public static function success(
        string $message = 'OK',
        mixed $data = null,
        int $status = Response::HTTP_OK,
        mixed $meta = null
    ): JsonResponse {
        return self::build(true, $message, $data, null, $meta, $status);
    }

    public static function error(
        string $message = 'Error',
        int $status = Response::HTTP_BAD_REQUEST,
        mixed $errors = null,
        mixed $data = null
    ): JsonResponse {
        return self::build(false, $message, $data, $errors, null, $status);
    }

    public static function paginated(
        string $message,
        AbstractPaginator $paginator,
        JsonResource $resource
    ): JsonResponse {
        return self::build(
            true,
            $message,
            $resource->toArray(request()),
            null,
            self::paginationMeta($paginator),
            Response::HTTP_OK
        );
    }

    protected static function build(
        bool $success,
        string $message,
        mixed $data,
        mixed $errors,
        mixed $meta,
        int $status
    ): JsonResponse {
        $payload = [
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
            'meta' => $meta,
        ];

        return response()->json($payload, $status);
    }

    protected static function paginationMeta(AbstractPaginator $paginator): array
    {
        return [
            'pagination' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }
}
