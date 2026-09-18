<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces JSON responses for API requests so clients always receive a
 * structured envelope instead of an HTML error page.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/v1/*')) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
