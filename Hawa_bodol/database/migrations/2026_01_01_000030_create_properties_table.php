<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("properties", function (Blueprint $table) {
            $table->id();
            $table->string("title_en"); $table->string("title_bn")->nullable();
            $table->text("description_en")->nullable(); $table->text("description_bn")->nullable();
            $table->string("total_area")->default("21 bigha");
            $table->string("location_en")->nullable(); $table->string("location_bn")->nullable();
            $table->decimal("latitude",10,7)->nullable(); $table->decimal("longitude",10,7)->nullable();
            $table->string("google_maps_url")->nullable();
            $table->json("highlights")->nullable();
            $table->string("image")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("properties"); }
};
