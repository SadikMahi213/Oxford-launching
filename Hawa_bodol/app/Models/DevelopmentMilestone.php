<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DevelopmentMilestone extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','phase','start_date','end_date','status','order','image'];
    protected $casts=['start_date'=>'date','end_date'=>'date'];
}
