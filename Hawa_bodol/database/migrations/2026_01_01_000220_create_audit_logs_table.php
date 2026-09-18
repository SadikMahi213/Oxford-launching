<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("audit_logs", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->nullable()->constrained()->nullOnDelete();
            $table->string("action");
            $table->string("entity_type")->nullable();
            $table->string("entity_id")->nullable();
            $table->text("old_value")->nullable();
            $table->text("new_value")->nullable();
            $table->string("ip")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("audit_logs"); }
};
