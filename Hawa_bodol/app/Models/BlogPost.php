<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BlogPost extends Model {
    protected $fillable=['title_en','title_bn','slug','excerpt_en','excerpt_bn','content_en','content_bn','category','thumbnail','seo_title','meta_description','author','status','published_at'];
    protected $casts=['published_at'=>'datetime'];
}
