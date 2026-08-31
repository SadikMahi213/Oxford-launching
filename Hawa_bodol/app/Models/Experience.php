<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Experience extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','image','category','order','is_active'];
    protected $casts=['is_active'=>'boolean'];
}
