<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SiteVisit extends Model {
    protected $fillable=['investor_lead_id','name','email','phone','preferred_date','visitors','message','status'];
    protected $casts=['preferred_date'=>'date'];
    public function lead(){ return $this->belongsTo(InvestorLead::class,'investor_lead_id'); }
}
