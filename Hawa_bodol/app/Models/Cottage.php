<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Cottage extends Model {
    protected $fillable=['name_en','name_bn','type','count','size','price_range','description_en','description_bn','image','features','order','is_active'];
    protected $casts=['features'=>'array','is_active'=>'boolean'];
}
