<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('game_slug')->nullable()->after('slug');
            $table->string('difficulty')->default('medium')->after('game_type');
            $table->text('rules')->nullable()->after('description');
            $table->json('config')->nullable()->after('metadata');
            $table->integer('play_count')->default(0)->after('sort_order');
            $table->integer('max_score')->default(0)->after('play_count');

            $table->index('game_slug');
            $table->index('difficulty');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->foreignId('provider_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn(['game_slug', 'difficulty', 'rules', 'config', 'play_count', 'max_score']);
        });

        Schema::table('games', function (Blueprint $table) {
            $table->foreignId('provider_id')->nullable(false)->change();
        });
    }
};
