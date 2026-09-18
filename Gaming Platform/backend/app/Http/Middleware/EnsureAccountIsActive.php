<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the authenticated user's account is in an active state.
 * Suspended or banned users cannot access protected endpoints.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if ($user && ! $user->isActive()) {
            throw ApiException::forbidden(
                'Your account is ' . $user->status . '. Please contact support.',
            );
        }

        return $next($request);
    }
}
