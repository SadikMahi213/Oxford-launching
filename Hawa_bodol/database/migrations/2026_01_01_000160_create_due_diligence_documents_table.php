<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("due_diligence_documents", function (Blueprint $table) {
            $table->id();
            $table->string("title");
            $table->string("category");
            $table->string("version")->nullable();
            $table->text("description")->nullable();
            $table->string("file_path")->nullable();
            $table->string("file_name")->nullable();
            $table->string("visibility")->default("private");
            $table->boolean("investor_access")->default(false);
            $table->boolean("is_published")->default(false);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("due_diligence_documents"); }
};
