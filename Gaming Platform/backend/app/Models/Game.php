<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider_id',
        'category_id',
        'name',
        'slug',
        'game_slug',
        'external_game_id',
        'game_type',
        'difficulty',
        'thumbnail_url',
        'banner_url',
        'description',
        'rules',
        'metadata',
        'config',
        'is_active',
        'is_featured',
        'has_demo',
        'sort_order',
        'play_count',
        'max_score',
        'min_bet',
        'max_bet',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'config' => 'array',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'has_demo' => 'boolean',
            'min_bet' => 'decimal:4',
            'max_bet' => 'decimal:4',
            'play_count' => 'integer',
            'max_score' => 'integer',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function provider(): BelongsTo
    {
        return $this->belongsTo(GameProvider::class, 'provider_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(GameCategory::class, 'category_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }

    public function scores(): HasMany
    {
        return $this->hasMany(GameScore::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isActive(): bool
    {
        return $this->is_active === true;
    }

    public function isFeatured(): bool
    {
        return $this->is_featured === true;
    }
}
