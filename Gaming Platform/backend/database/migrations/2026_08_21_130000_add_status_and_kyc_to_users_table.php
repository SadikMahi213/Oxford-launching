<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add platform-specific account state columns to the users table.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status')->default(\App\Models\User::STATUS_ACTIVE)->after('password');
            $table->string('kyc_status')->default(\App\Models\User::KYC_UNVERIFIED)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status', 'kyc_status']);
        });
    }
};
