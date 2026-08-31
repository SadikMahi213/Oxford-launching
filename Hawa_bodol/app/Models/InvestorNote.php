<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InvestorNote extends Model {
    protected $fillable=['investor_lead_id','user_id','note'];
    public function lead(){ return $this->belongsTo(InvestorLead::class,'investor_lead_id'); }
    public function user(){ return $this->belongsTo(User::class); }
}
