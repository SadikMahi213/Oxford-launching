<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FundingAllocation extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','percentage','amount','color','icon','order'];
}
