<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FinancialScenario extends Model {
    protected $fillable=['name','label_en','label_bn','rooms','adr','occupancy','room_revenue','restaurant_revenue','activity_revenue','total_revenue','opex_percent','ebitda','net_profit','roi','payback_years','break_even_occupancy','is_active','order'];
}
