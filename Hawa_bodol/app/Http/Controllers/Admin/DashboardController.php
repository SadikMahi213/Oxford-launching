<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\InvestorLead;
use App\Models\SiteVisit;
use App\Models\ContactMessage;
use App\Models\FundingAllocation;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
class DashboardController extends Controller {
    public function index(){
        $totalLeads=InvestorLead::count();
        $newLeads=InvestorLead::where('status','new')->count();
        $qualified=InvestorLead::where('status','qualified')->count();
        $siteVisits=SiteVisit::count();
        $pendingVisits=SiteVisit::where('status','pending')->count();
        $deckRequests=InvestorLead::where('request_deck',true)->count();
        $ddRequests=InvestorLead::where('request_due_diligence',true)->count();
        $contactUnread=ContactMessage::where('status','unread')->count();
        $fundingTotal=SiteSetting::getValue('funding_target','en') ?? '30000000';
        $recentLeads=InvestorLead::latest()->take(5)->get();
        $recentMessages=ContactMessage::latest()->take(5)->get();
        $leadsByRange=InvestorLead::selectRaw('investment_range, count(*) as c')->groupBy('investment_range')->pluck('c','investment_range');
        $leadsByStatus=InvestorLead::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c','status');
        return view('admin.dashboard', compact('totalLeads','newLeads','qualified','siteVisits','pendingVisits','deckRequests','ddRequests','contactUnread','fundingTotal','recentLeads','recentMessages','leadsByRange','leadsByStatus'));
    }
}
