<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GalleryItem extends Model {
    protected $fillable=['title','category','image','video_url','caption','source_type','source_url','copyright_status','is_featured','is_published','order'];
    protected $casts=['is_featured'=>'boolean','is_published'=>'boolean'];
}
