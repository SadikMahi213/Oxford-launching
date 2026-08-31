<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MarketStatistic extends Model {
    protected $fillable=['metric_en','metric_bn','value','source','source_url','category','order'];
}
