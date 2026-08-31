<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Risk extends Model {
    protected $fillable=['title_en','title_bn','category','risk_en','risk_bn','impact_en','impact_bn','mitigation_en','mitigation_bn','verification_status','severity','order'];
}
