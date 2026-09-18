<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("financial_scenarios", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("label_en"); $table->string("label_bn")->nullable();
            $table->integer("rooms")->default(18);
            $table->integer("adr")->default(10000);
            $table->decimal("occupancy",5,2)->default(55);
            $table->bigInteger("room_revenue")->default(0);
            $table->bigInteger("restaurant_revenue")->default(0);
            $table->bigInteger("activity_revenue")->default(0);
            $table->bigInteger("total_revenue")->default(0);
            $table->integer("opex_percent")->default(55);
            $table->bigInteger("ebitda")->default(0);
            $table->bigInteger("net_profit")->default(0);
            $table->decimal("roi",5,2)->default(0);
            $table->decimal("payback_years",4,1)->default(0);
            $table->decimal("break_even_occupancy",5,2)->default(30);
            $table->boolean("is_active")->default(true);
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("financial_scenarios"); }
};
