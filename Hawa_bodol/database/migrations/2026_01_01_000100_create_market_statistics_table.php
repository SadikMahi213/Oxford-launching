<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("market_statistics", function (Blueprint $table) {
            $table->id();
            $table->string("metric_en"); $table->string("metric_bn")->nullable();
            $table->string("value");
            $table->string("source")->nullable();
            $table->string("source_url")->nullable();
            $table->string("category")->nullable();
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("market_statistics"); }
};
