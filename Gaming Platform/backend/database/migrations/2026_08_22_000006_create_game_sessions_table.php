<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('game_providers')->cascadeOnDelete();
            $table->string('external_session_id')->nullable();
            $table->string('status')->default('active');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('launch_data')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['provider_id', 'status']);
            $table->index('external_session_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_sessions');
    }
};
