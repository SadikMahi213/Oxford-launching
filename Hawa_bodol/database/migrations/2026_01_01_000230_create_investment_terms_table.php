<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("investment_terms", function (Blueprint $table) {
            $table->id();
            $table->string("title_en"); $table->string("title_bn")->nullable();
            $table->text("description_en")->nullable(); $table->text("description_bn")->nullable();
            $table->string("value")->nullable();
            $table->string("category")->nullable();
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("investment_terms"); }
};
