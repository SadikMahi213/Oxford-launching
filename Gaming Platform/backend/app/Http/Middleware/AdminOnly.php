<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the authenticated user has the 'admin' role.
 */
class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (! $user || ! $user->hasRole('admin')) {
            throw ApiException::forbidden('Admin access required.');
        }

        return $next($request);
    }
}
