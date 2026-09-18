<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'api_endpoint',
        'api_key',
        'secret_key',
        'is_active',
        'config',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'config' => 'array',
        ];
    }

    protected $hidden = [
        'api_key',
        'secret_key',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function games(): HasMany
    {
        return $this->hasMany(Game::class, 'provider_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(GameSession::class, 'provider_id');
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
}
