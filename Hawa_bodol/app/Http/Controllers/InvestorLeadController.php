<?php
namespace App\Http\Controllers;
use App\Models\InvestorLead;
use App\Models\SiteVisit;
use Illuminate\Http\Request;
class InvestorLeadController extends Controller {
    public function store(Request $request){
        $data=$request->validate([
            'name'=>'required|string|max:255',
            'company'=>'nullable|string|max:255',
            'email'=>'required|email',
            'phone'=>'required|string|max:30',
            'location'=>'nullable|string|max:255',
            'investment_range'=>'nullable|string|max:100',
            'investment_timeline'=>'nullable|string|max:100',
            'investor_type'=>'nullable|string|max:100',
            'message'=>'nullable|string|max:2000',
            'request_deck'=>'nullable|boolean',
            'request_site_visit'=>'nullable|boolean',
            'request_due_diligence'=>'nullable|boolean',
        ]);
        $data['request_deck']=$request->boolean('request_deck');
        $data['request_site_visit']=$request->boolean('request_site_visit');
        $data['request_due_diligence']=$request->boolean('request_due_diligence');
        $lead=InvestorLead::create($data);
        return back()->with('success','Thank you! Your inquiry has been received. Our team will contact you within 24 hours. Submitting this form does not constitute an investment commitment.');
    }
    public function siteVisitStore(Request $request){
        $data=$request->validate([
            'name'=>'required|string|max:255',
            'email'=>'required|email',
            'phone'=>'required|string|max:30',
            'preferred_date'=>'nullable|date',
            'visitors'=>'nullable|integer|min:1|max:20',
            'message'=>'nullable|string|max:2000',
        ]);
        $sv=SiteVisit::create($data);
        return back()->with('success','Site visit request received. We will confirm shortly.');
    }
    public function deckRequest(Request $request){
        $data=$request->validate([
            'name'=>'required|string|max:255',
            'company'=>'nullable|string|max:255',
            'email'=>'required|email',
            'phone'=>'required|string|max:30',
            'investment_range'=>'nullable|string',
            'message'=>'nullable|string|max:2000',
        ]);
        $data['request_deck']=true;
        $lead=InvestorLead::create($data);
        return back()->with('success','Investor deck request received. Check your email shortly. Download will be available after qualification.');
    }
}
