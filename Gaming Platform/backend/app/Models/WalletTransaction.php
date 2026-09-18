<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use HasFactory;

    // Transaction types
    public const TYPE_CREDIT = 'credit';
    public const TYPE_DEBIT = 'debit';
    public const TYPE_HOLD = 'hold';
    public const TYPE_RELEASE = 'release';
    public const TYPE_TRANSFER_IN = 'transfer_in';
    public const TYPE_TRANSFER_OUT = 'transfer_out';

    // Transaction statuses
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_PENDING = 'pending';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REVERSED = 'reversed';

    protected $fillable = [
        'wallet_id',
        'user_id',
        'type',
        'reference_type',
        'reference_id',
        'amount',
        'balance_before',
        'balance_after',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'balance_before' => 'decimal:4',
            'balance_after' => 'decimal:4',
            'metadata' => 'array',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Is this a credit (incoming) transaction?
     */
    public function isCredit(): bool
    {
        return in_array($this->type, [
            self::TYPE_CREDIT,
            self::TYPE_RELEASE,
            self::TYPE_TRANSFER_IN,
        ], true);
    }

    /**
     * Is this a debit (outgoing) transaction?
     */
    public function isDebit(): bool
    {
        return in_array($this->type, [
            self::TYPE_DEBIT,
            self::TYPE_HOLD,
            self::TYPE_TRANSFER_OUT,
        ], true);
    }
}
