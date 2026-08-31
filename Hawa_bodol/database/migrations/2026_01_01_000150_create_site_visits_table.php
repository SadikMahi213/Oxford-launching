<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("site_visits", function (Blueprint $table) {
            $table->id();
            $table->foreignId("investor_lead_id")->nullable()->constrained()->nullOnDelete();
            $table->string("name"); $table->string("email"); $table->string("phone");
            $table->date("preferred_date")->nullable();
            $table->integer("visitors")->default(1);
            $table->text("message")->nullable();
            $table->string("status")->default("pending");
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("site_visits"); }
};
