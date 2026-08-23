<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('game_providers')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('game_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('external_game_id');
            $table->string('game_type')->default('slots');
            $table->string('thumbnail_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('has_demo')->default(false);
            $table->integer('sort_order')->default(0);
            $table->decimal('min_bet', 10, 4)->nullable();
            $table->decimal('max_bet', 10, 4)->nullable();
            $table->timestamps();

            $table->unique(['provider_id', 'external_game_id']);
            $table->index('is_active');
            $table->index('is_featured');
            $table->index('game_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
