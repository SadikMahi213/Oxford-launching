<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("resort_facilities", function (Blueprint $table) {
            $table->id();
            $table->string("title_en"); $table->string("title_bn")->nullable();
            $table->text("description_en")->nullable(); $table->text("description_bn")->nullable();
            $table->string("icon")->nullable();
            $table->string("image")->nullable();
            $table->string("category")->nullable();
            $table->integer("order")->default(0);
            $table->boolean("is_active")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("resort_facilities"); }
};
