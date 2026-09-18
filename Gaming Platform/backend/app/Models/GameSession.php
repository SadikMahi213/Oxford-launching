<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameSession extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_ENDED = 'ended';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'user_id',
        'game_id',
        'provider_id',
        'external_session_id',
        'status',
        'ip_address',
        'user_agent',
        'launch_data',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'launch_data' => 'array',
            'ended_at' => 'datetime',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(GameProvider::class, 'provider_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
