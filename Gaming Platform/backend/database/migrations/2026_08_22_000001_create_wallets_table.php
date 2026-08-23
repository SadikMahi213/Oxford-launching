<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3)->default('USD');
            $table->decimal('available_balance', 12, 4)->default(0);
            $table->decimal('locked_balance', 12, 4)->default(0);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'currency']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
