<?php
namespace App\Http\Controllers;
use App\Models\Cottage;
use App\Models\ResortFacility;
use App\Models\Experience;
use App\Models\FundingAllocation;
use App\Models\FinancialScenario;
use App\Models\MarketStatistic;
use App\Models\Competitor;
use App\Models\DevelopmentMilestone;
use App\Models\GalleryItem;
use App\Models\Faq;
use App\Models\TeamMember;
use App\Models\MasterplanZone;
use App\Models\SiteSetting;
use App\Models\BlogPost;
use App\Models\Risk;
use App\Models\InvestmentTerm;
use Illuminate\Http\Request;
class PublicController extends Controller {
    public function home(){
        $fundings = FundingAllocation::orderBy('order')->get();
        $scenarios = FinancialScenario::orderBy('order')->get();
        $facilities = ResortFacility::where('is_active',true)->orderBy('order')->take(6)->get();
        $cottages = Cottage::where('is_active',true)->orderBy('order')->take(4)->get();
        $milestones = DevelopmentMilestone::orderBy('order')->take(6)->get();
        $gallery = GalleryItem::where('is_published',true)->orderBy('order')->take(8)->get();
        $faqs = Faq::where('is_published',true)->orderBy('order')->take(5)->get();
        return view('public.home', compact('fundings','scenarios','facilities','cottages','milestones','gallery','faqs'));
    }
    public function opportunity(){ $stats=MarketStatistic::orderBy('order')->get(); $competitors=Competitor::orderBy('order')->take(8)->get(); return view('public.opportunity', compact('stats','competitors')); }
    public function property(){ $zones=MasterplanZone::orderBy('order')->get(); return view('public.property', compact('zones')); }
    public function resort(){ $cottages=Cottage::where('is_active',true)->orderBy('order')->get(); $facilities=ResortFacility::where('is_active',true)->orderBy('order')->get(); $experiences=Experience::where('is_active',true)->orderBy('order')->get(); return view('public.resort', compact('cottages','facilities','experiences')); }
    public function market(){ $stats=MarketStatistic::orderBy('order')->get(); $competitors=Competitor::orderBy('order')->get(); return view('public.market', compact('stats','competitors')); }
    public function investment(){ $allocations=FundingAllocation::orderBy('order')->get(); $terms=InvestmentTerm::orderBy('order')->get(); return view('public.investment', compact('allocations','terms')); }
    public function financials(){ $scenarios=FinancialScenario::orderBy('order')->get(); return view('public.financials', compact('scenarios')); }
    public function investors(){ return view('public.investors'); }
    public function development(){ $milestones=DevelopmentMilestone::orderBy('order')->get(); return view('public.development', compact('milestones')); }
    public function risk(){ $risks=Risk::orderBy('order')->get()->groupBy('category'); return view('public.risk', compact('risks')); }
    public function team(){ $members=TeamMember::where('is_active',true)->orderBy('order')->get()->groupBy('category'); $all=TeamMember::where('is_active',true)->orderBy('order')->get(); return view('public.team', compact('members','all')); }
    public function gallery(){ $items=GalleryItem::where('is_published',true)->orderBy('order')->get()->groupBy('category'); $all=GalleryItem::where('is_published',true)->orderBy('order')->get(); return view('public.gallery', compact('items','all')); }
    public function faq(){ $faqs=Faq::where('is_published',true)->orderBy('order')->get()->groupBy('category'); $all=Faq::where('is_published',true)->orderBy('order')->get(); return view('public.faq', compact('faqs','all')); }
    public function contact(){ return view('public.contact'); }
    public function blog(){ $posts=BlogPost::where('status','published')->orderByDesc('published_at')->paginate(9); return view('public.blog', compact('posts')); }
    public function blogShow($slug){ $post=BlogPost::where('slug',$slug)->firstOrFail(); return view('public.blog-show', compact('post')); }
    public function privacy(){ return view('public.privacy'); }
    public function terms(){ return view('public.terms'); }
    public function disclaimer(){ return view('public.disclaimer'); }
    public function investorInquiry(){ return view('public.investor-inquiry'); }
    public function investorDeck(){ return view('public.investor-deck'); }
}
