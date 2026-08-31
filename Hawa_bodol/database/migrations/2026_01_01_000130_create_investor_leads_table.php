<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("investor_leads", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("company")->nullable();
            $table->string("email");
            $table->string("phone");
            $table->string("location")->nullable();
            $table->string("investment_range")->nullable();
            $table->string("investment_timeline")->nullable();
            $table->string("investor_type")->nullable();
            $table->text("message")->nullable();
            $table->boolean("request_deck")->default(false);
            $table->boolean("request_site_visit")->default(false);
            $table->boolean("request_due_diligence")->default(false);
            $table->string("status")->default("new");
            $table->text("admin_notes")->nullable();
            $table->date("follow_up_date")->nullable();
            $table->foreignId("assigned_to")->nullable()->constrained("users")->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }
    public function down(): void { Schema::dropIfExists("investor_leads"); }
};
