<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DemoCreditController;
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\GameCategoryController;
use App\Http\Controllers\Api\V1\GameController;
use App\Http\Controllers\Api\V1\GameLaunchController;
use App\Http\Controllers\Api\V1\GameProviderController;
use App\Http\Controllers\Api\V1\GameScoreController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\WalletController;
use Illuminate\Support\Facades\Route;

/*
 * API v1 routes. The "api/v1" prefix and the "api" middleware group
 * (SubstituteBindings + throttle:api) are applied in bootstrap/app.php.
 */

/*
|--------------------------------------------------------------------------
| Public Authentication Routes (no token required)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    // Strict throttle on credential endpoints to blunt brute-force attempts.
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');

    // Password reset — public, but rate-limited.
    Route::post('forgot-password', [PasswordResetController::class, 'forgotPassword'])
        ->middleware('throttle:auth');
    Route::post('reset-password', [PasswordResetController::class, 'resetPassword'])
        ->middleware('throttle:auth');
});

/*
|--------------------------------------------------------------------------
| Email Verification Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('email/verify/send', [EmailVerificationController::class, 'send'])
        ->middleware('throttle:auth');
});

// Verify endpoint is public — users click the link from their email while logged out.
Route::post('email/verify', [EmailVerificationController::class, 'verify']);

/*
|--------------------------------------------------------------------------
| Token-Protected Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
    // Authentication
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });

    // Profile management
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::put('password', [ProfileController::class, 'changePassword']);
    });

    // Wallet
    Route::prefix('wallet')->group(function () {
        Route::get('/', [WalletController::class, 'index']);
        Route::get('/{walletId}', [WalletController::class, 'show']);
        Route::post('/credit', [WalletController::class, 'credit']);
        Route::post('/debit', [WalletController::class, 'debit']);
        Route::post('/hold', [WalletController::class, 'hold']);
        Route::post('/release', [WalletController::class, 'release']);
        Route::post('/transfer', [WalletController::class, 'transfer']);
    });

    // Game Launch (authenticated users)
    Route::prefix('games')->group(function () {
        Route::post('/launch', [GameLaunchController::class, 'launch']);
        Route::get('/sessions', [GameLaunchController::class, 'sessions']);
        Route::post('/scores', [GameScoreController::class, 'store']);
        Route::get('/scores', [GameScoreController::class, 'index']);
        Route::get('/{id}/leaderboard', [GameScoreController::class, 'leaderboard']);
    });

    // Demo Credits
    Route::prefix('demo-credits')->group(function () {
        Route::get('/balance', [DemoCreditController::class, 'balance']);
        Route::post('/daily-bonus', [DemoCreditController::class, 'claimDailyBonus']);
        Route::get('/stats', [DemoCreditController::class, 'stats']);
    });

    // Global Leaderboard
    Route::get('/leaderboard', [GameScoreController::class, 'globalLeaderboard']);
});

/*
|--------------------------------------------------------------------------
| Admin-Only Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'account.active', 'admin'])->prefix('admin')->group(function () {
    Route::prefix('users')->group(function () {
        Route::get('/', [AdminUserController::class, 'index']);
        Route::get('/{id}', [AdminUserController::class, 'show']);
        Route::put('/{id}/status', [AdminUserController::class, 'updateStatus']);
    });

    // Admin Dashboard
    Route::get('/dashboard', [AdminDashboardController::class, 'stats']);

    // Game Provider management (admin)
    Route::prefix('providers')->group(function () {
        Route::get('/', [GameProviderController::class, 'index']);
        Route::post('/', [GameProviderController::class, 'store']);
        Route::get('/{id}', [GameProviderController::class, 'show']);
        Route::put('/{id}', [GameProviderController::class, 'update']);
    });

    // Game management (admin)
    Route::prefix('games')->group(function () {
        Route::get('/', [AdminDashboardController::class, 'games']);
        Route::post('/', [AdminDashboardController::class, 'storeGame']);
        Route::put('/{id}', [AdminDashboardController::class, 'updateGame']);
        Route::delete('/{id}', [AdminDashboardController::class, 'destroyGame']);
        Route::post('/{id}/toggle-active', [AdminDashboardController::class, 'toggleActive']);
        Route::post('/{id}/toggle-featured', [AdminDashboardController::class, 'toggleFeatured']);
    });

    // Game Category management (admin)
    Route::prefix('categories')->group(function () {
        Route::get('/', [AdminDashboardController::class, 'categories']);
        Route::post('/', [AdminDashboardController::class, 'storeCategory']);
        Route::put('/{id}', [AdminDashboardController::class, 'updateCategory']);
        Route::delete('/{id}', [AdminDashboardController::class, 'destroyCategory']);
    });
});

/*
|--------------------------------------------------------------------------
| Public Game Routes (no auth required for browsing)
|--------------------------------------------------------------------------
*/
Route::prefix('games')->group(function () {
    Route::get('/featured', [GameController::class, 'featured']);
    Route::get('/', [GameController::class, 'index']);
    Route::get('/by-slug/{slug}', [GameController::class, 'showBySlug']);
    Route::get('/{id}', [GameController::class, 'show']);
});

Route::prefix('categories')->group(function () {
    Route::get('/', [GameCategoryController::class, 'index']);
});

/*
|--------------------------------------------------------------------------
| Health / Probe
|--------------------------------------------------------------------------
*/
Route::get('ping', fn () => response()->json([
    'success' => true,
    'message' => 'pong',
    'data' => null,
    'errors' => null,
    'meta' => null,
]));
