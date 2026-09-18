<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameScore extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'game_id',
        'score',
        'credits_earned',
        'credits_spent',
        'duration_seconds',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'credits_earned' => 'integer',
            'credits_spent' => 'integer',
            'duration_seconds' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
