<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MasterplanZone extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','area','percentage','icon','image','order'];
}
