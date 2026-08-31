<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("cottages", function (Blueprint $table) {
            $table->id();
            $table->string("name_en"); $table->string("name_bn")->nullable();
            $table->string("type")->nullable();
            $table->integer("count")->default(1);
            $table->string("size")->nullable();
            $table->string("price_range")->nullable();
            $table->text("description_en")->nullable(); $table->text("description_bn")->nullable();
            $table->string("image")->nullable();
            $table->json("features")->nullable();
            $table->integer("order")->default(0);
            $table->boolean("is_active")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("cottages"); }
};
