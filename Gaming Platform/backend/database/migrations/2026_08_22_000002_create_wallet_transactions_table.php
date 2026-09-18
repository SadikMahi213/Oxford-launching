<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->decimal('amount', 12, 4);
            $table->decimal('balance_before', 12, 4);
            $table->decimal('balance_after', 12, 4);
            $table->string('status')->default('completed');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['wallet_id', 'type']);
            $table->index(['user_id', 'type']);
            $table->index(['reference_type', 'reference_id']);
            $table->index('created_at');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
