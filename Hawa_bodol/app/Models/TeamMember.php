<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TeamMember extends Model {
    protected $fillable=['name','position_en','position_bn','bio_en','bio_bn','category','photo','linkedin','website','order','is_active'];
    protected $casts=['is_active'=>'boolean'];
}
