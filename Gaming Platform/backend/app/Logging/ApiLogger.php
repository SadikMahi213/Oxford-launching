<?php

namespace App\Logging;

use Illuminate\Support\Facades\Log;

/**
 * Structured logging helper for the API layer.
 *
 * Convention: API-level events (auth success/failure, rate-limit hits,
 * unexpected service errors) are logged to the dedicated "api" channel
 * with consistent context keys, so they can be shipped/alerted on later.
 */
class ApiLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function info(string $message, array $context = []): void
    {
        Log::channel('api')->info($message, self::withRequest($context));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function warning(string $message, array $context = []): void
    {
        Log::channel('api')->warning($message, self::withRequest($context));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function error(string $message, array $context = []): void
    {
        Log::channel('api')->error($message, self::withRequest($context));
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    protected static function withRequest(array $context): array
    {
        if (! app()->bound('request') || ! request()) {
            return $context;
        }

        return array_merge([
            'ip' => request()->ip(),
            'route' => request()->path(),
            'method' => request()->method(),
        ], $context);
    }
}
