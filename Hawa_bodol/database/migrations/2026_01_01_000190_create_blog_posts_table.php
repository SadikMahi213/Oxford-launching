<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("blog_posts", function (Blueprint $table) {
            $table->id();
            $table->string("title_en"); $table->string("title_bn")->nullable();
            $table->string("slug")->unique();
            $table->text("excerpt_en")->nullable(); $table->text("excerpt_bn")->nullable();
            $table->longText("content_en")->nullable(); $table->longText("content_bn")->nullable();
            $table->string("category")->nullable();
            $table->string("thumbnail")->nullable();
            $table->string("seo_title")->nullable();
            $table->text("meta_description")->nullable();
            $table->string("author")->nullable();
            $table->string("status")->default("draft");
            $table->timestamp("published_at")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("blog_posts"); }
};
