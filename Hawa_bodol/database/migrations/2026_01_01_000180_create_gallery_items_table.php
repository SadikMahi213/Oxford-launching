<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("gallery_items", function (Blueprint $table) {
            $table->id();
            $table->string("title");
            $table->string("category");
            $table->string("image")->nullable();
            $table->string("video_url")->nullable();
            $table->text("caption")->nullable();
            $table->string("source_type")->default("reference");
            $table->string("source_url")->nullable();
            $table->string("copyright_status")->nullable();
            $table->boolean("is_featured")->default(false);
            $table->boolean("is_published")->default(true);
            $table->integer("order")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("gallery_items"); }
};
