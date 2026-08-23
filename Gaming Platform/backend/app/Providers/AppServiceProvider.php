<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Define the API rate limiters used by the "throttle:api" and
     * "throttle:auth" middleware.
     */
    protected function configureRateLimiting(): void
    {
        // General API limiter: 120 req/min for authenticated users,
        // 60 req/min per IP for guests.
        RateLimiter::for('api', function (Request $request) {
            if (app()->environment('testing')) {
                return Limit::none();
            }

            return $request->user()
                ? Limit::perMinute(120)->by($request->user()->getAuthIdentifier())
                : Limit::perMinute(60)->by($request->ip());
        });

        // Stricter limiter for credential endpoints (login/register).
        RateLimiter::for('auth', function (Request $request) {
            if (app()->environment('testing')) {
                return Limit::none();
            }

            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
