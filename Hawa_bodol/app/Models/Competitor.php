<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Competitor extends Model {
    protected $fillable=['name','location','rooms','price_range','facilities','target_customer','rating','strengths','weaknesses','usp','source','last_verified','order'];
    protected $casts=['last_verified'=>'date'];
}
