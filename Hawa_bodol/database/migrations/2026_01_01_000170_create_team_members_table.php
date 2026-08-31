<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("team_members", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("position_en"); $table->string("position_bn")->nullable();
            $table->text("bio_en")->nullable(); $table->text("bio_bn")->nullable();
            $table->string("category")->default("management");
            $table->string("photo")->nullable();
            $table->string("linkedin")->nullable();
            $table->string("website")->nullable();
            $table->integer("order")->default(0);
            $table->boolean("is_active")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("team_members"); }
};
