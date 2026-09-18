<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->integer('score')->default(0);
            $table->integer('credits_earned')->default(0);
            $table->integer('credits_spent')->default(0);
            $table->integer('duration_seconds')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'game_id']);
            $table->index(['game_id', 'score']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_scores');
    }
};
