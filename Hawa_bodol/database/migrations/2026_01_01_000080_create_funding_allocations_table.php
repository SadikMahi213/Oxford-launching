<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("funding_allocations", function (Blueprint $table) {
            $table->id();
            $table->string("title_en"); $table->string("title_bn")->nullable();
            $table->text("description_en")->nullable(); $table->text("description_bn")->nullable();
            $table->decimal("percentage",5,2)->default(0);
            $table->bigInteger("amount")->default(0);
            $table->string("color")->nullable();
            $table->string("icon")->nullable();
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("funding_allocations"); }
};
