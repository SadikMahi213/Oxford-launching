<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("competitors", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("location")->nullable();
            $table->string("rooms")->nullable();
            $table->string("price_range")->nullable();
            $table->string("facilities")->nullable();
            $table->string("target_customer")->nullable();
            $table->string("rating")->nullable();
            $table->text("strengths")->nullable();
            $table->text("weaknesses")->nullable();
            $table->string("usp")->nullable();
            $table->string("source")->nullable();
            $table->date("last_verified")->nullable();
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("competitors"); }
};
