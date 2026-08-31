<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InvestmentTerm extends Model {
    protected $fillable=['title_en','title_bn','description_en','description_bn','value','category','order'];
}
