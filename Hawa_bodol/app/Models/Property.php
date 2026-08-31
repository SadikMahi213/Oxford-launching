<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Property extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','total_area','location_en','location_bn','latitude','longitude','google_maps_url','highlights','image'];
    protected $casts=['highlights'=>'array'];
}
