<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class InvestorLead extends Model {
    use SoftDeletes;
    protected $fillable=['name','company','email','phone','location','investment_range','investment_timeline','investor_type','message','request_deck','request_site_visit','request_due_diligence','status','admin_notes','follow_up_date','assigned_to'];
    protected $casts=['request_deck'=>'boolean','request_site_visit'=>'boolean','request_due_diligence'=>'boolean','follow_up_date'=>'date'];
    public function notes(){ return $this->hasMany(InvestorNote::class); }
    public function siteVisits(){ return $this->hasMany(SiteVisit::class); }
}
