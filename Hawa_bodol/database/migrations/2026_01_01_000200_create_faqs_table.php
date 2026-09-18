<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("faqs", function (Blueprint $table) {
            $table->id();
            $table->string("question_en"); $table->string("question_bn")->nullable();
            $table->text("answer_en"); $table->text("answer_bn")->nullable();
            $table->string("category")->nullable();
            $table->integer("order")->default(0);
            $table->boolean("is_published")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("faqs"); }
};
