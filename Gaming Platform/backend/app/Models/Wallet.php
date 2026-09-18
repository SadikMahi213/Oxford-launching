<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_FROZEN = 'frozen';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'user_id',
        'currency',
        'available_balance',
        'locked_balance',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'available_balance' => 'decimal:4',
            'locked_balance' => 'decimal:4',
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

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
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

    /**
     * Total balance = available + locked.
     */
    public function getTotalBalanceAttribute(): string
    {
        return bcadd($this->available_balance, $this->locked_balance, 4);
    }
}
