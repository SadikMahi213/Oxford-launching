<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_BANNED = 'banned';

    public const KYC_UNVERIFIED = 'unverified';
    public const KYC_PENDING = 'pending';
    public const KYC_VERIFIED = 'verified';
    public const KYC_REJECTED = 'rejected';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'kyc_status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'string',
            'kyc_status' => 'string',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Get the wallets for the user.
     */
    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    /**
     * Get the game sessions for the user.
     */
    public function gameSessions()
    {
        return $this->hasMany(GameSession::class);
    }

    /**
     * Get the game scores for the user.
     */
    public function gameScores()
    {
        return $this->hasMany(GameScore::class);
    }

    /**
     * Get the user achievements.
     */
    public function userAchievements()
    {
        return $this->hasMany(UserAchievement::class);
    }

    /**
     * Get the total demo credits for the user.
     */
    public function getDemoCreditsAttribute(): int
    {
        $wallet = $this->wallets()->where('currency', 'DEM')->first();
        return $wallet ? (int) $wallet->available_balance : 0;
    }
}
