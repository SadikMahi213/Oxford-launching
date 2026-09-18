<?php

use App\Exceptions\ApiException;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\EnsureAccountIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Enable API rate limiting (uses the "api" rate limiter registered in AppServiceProvider).
        $middleware->throttleApi('api');

        // Custom middleware aliases.
        $middleware->alias([
            'account.active' => EnsureAccountIsActive::class,
            'admin' => AdminOnly::class,

            // Spatie permission middleware.
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

        // Force JSON responses for the /api/v1 routes.
        $middleware->prepend(\App\Http\Middleware\ForceJsonResponse::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Render domain API exceptions with a consistent envelope.
        $exceptions->render(function (ApiException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => $e->getErrors(),
                ], $e->getStatusCode());
            }

            return null;
        });

        // Catch validation errors and normalize them into the API envelope.
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $e->errors(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            return null;
        });

        // Catch authentication failures (missing/invalid token).
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                    'errors' => null,
                ], Response::HTTP_UNAUTHORIZED);
            }

            return null;
        });

        // Catch authorization failures (policy/middleware).
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden.',
                    'errors' => null,
                ], Response::HTTP_FORBIDDEN);
            }

            return null;
        });

        // Catch model not found (404).
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Resource not found.',
                    'errors' => null,
                ], Response::HTTP_NOT_FOUND);
            }

            return null;
        });

        // Catch throttle rate limit exceptions.
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please try again later.',
                    'errors' => null,
                ], Response::HTTP_TOO_MANY_REQUESTS);
            }

            return null;
        });
    })->create();
