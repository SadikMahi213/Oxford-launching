<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\InvestorLeadController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\InvestorLeadAdminController;
use App\Http\Controllers\Admin\ContactAdminController;
use App\Http\Controllers\Admin\SiteVisitAdminController;

Route::get('/', [PublicController::class,'home'])->name('home');
Route::get('/opportunity', [PublicController::class,'opportunity'])->name('opportunity');
Route::get('/property', [PublicController::class,'property'])->name('property');
Route::get('/resort', [PublicController::class,'resort'])->name('resort');
Route::get('/market', [PublicController::class,'market'])->name('market');
Route::get('/investment', [PublicController::class,'investment'])->name('investment');
Route::get('/financials', [PublicController::class,'financials'])->name('financials');
Route::get('/investors', [PublicController::class,'investors'])->name('investors');
Route::get('/development', [PublicController::class,'development'])->name('development');
Route::get('/risk-and-due-diligence', [PublicController::class,'risk'])->name('risk');
Route::get('/team', [PublicController::class,'team'])->name('team');
Route::get('/gallery', [PublicController::class,'gallery'])->name('gallery');
Route::get('/faq', [PublicController::class,'faq'])->name('faq');
Route::get('/contact', [PublicController::class,'contact'])->name('contact');
Route::get('/investor-inquiry', [PublicController::class,'investorInquiry'])->name('investor.inquiry');
Route::get('/investor-deck', [PublicController::class,'investorDeck'])->name('investor.deck');
Route::get('/blog', [PublicController::class,'blog'])->name('blog');
Route::get('/blog/{slug}', [PublicController::class,'blogShow'])->name('blog.show');
Route::get('/privacy', [PublicController::class,'privacy'])->name('privacy');
Route::get('/terms', [PublicController::class,'terms'])->name('terms');
Route::get('/disclaimer', [PublicController::class,'disclaimer'])->name('disclaimer');

Route::post('/investor-lead', [InvestorLeadController::class,'store'])->name('investor.lead.store');
Route::post('/site-visit', [InvestorLeadController::class,'siteVisitStore'])->name('site.visit.store');
Route::post('/deck-request', [InvestorLeadController::class,'deckRequest'])->name('deck.request');
Route::post('/contact', [ContactController::class,'store'])->name('contact.store');

Route::get('/locale/{locale}', function($locale){
    if(in_array($locale,['en','bn'])) session(['locale'=>$locale]);
    return back();
})->name('locale.switch');

Route::get('/login', [AuthController::class,'showLogin'])->name('login');
Route::post('/login', [AuthController::class,'login'])->name('login.post');
Route::post('/logout', [AuthController::class,'logout'])->name('logout');

// Admin
Route::prefix('admin')->middleware(['auth','admin'])->name('admin.')->group(function(){
    Route::get('/', [DashboardController::class,'index'])->name('dashboard');
    // Investor leads admin
    Route::get('/investor-leads', [InvestorLeadAdminController::class,'index'])->name('investor-leads.index');
    Route::get('/investor-leads/{id}', [InvestorLeadAdminController::class,'show'])->name('investor-leads.show');
    Route::put('/investor-leads/{id}/status', [InvestorLeadAdminController::class,'updateStatus'])->name('investor-leads.status');
    Route::post('/investor-leads/{id}/note', [InvestorLeadAdminController::class,'addNote'])->name('investor-leads.note');
    Route::delete('/investor-leads/{id}', [InvestorLeadAdminController::class,'destroy'])->name('investor-leads.destroy');
    Route::get('/site-visits', [SiteVisitAdminController::class,'index'])->name('site-visits.index');
    Route::put('/site-visits/{id}', [SiteVisitAdminController::class,'update'])->name('site-visits.update');
    Route::delete('/site-visits/{id}', [SiteVisitAdminController::class,'destroy'])->name('site-visits.destroy');
    Route::get('/contacts', [ContactAdminController::class,'index'])->name('contacts.index');
    Route::get('/contacts/{id}', [ContactAdminController::class,'show'])->name('contacts.show');
    Route::put('/contacts/{id}', [ContactAdminController::class,'update'])->name('contacts.update');
    Route::delete('/contacts/{id}', [ContactAdminController::class,'destroy'])->name('contacts.destroy');

    $cruds = [
        'funding' => App\Http\Controllers\Admin\FundingAllocationController::class,
        'financials' => App\Http\Controllers\Admin\FinancialScenarioController::class,
        'cottages' => App\Http\Controllers\Admin\CottageController::class,
        'facilities' => App\Http\Controllers\Admin\ResortFacilityController::class,
        'experiences' => App\Http\Controllers\Admin\ExperienceController::class,
        'masterplan' => App\Http\Controllers\Admin\MasterplanZoneController::class,
        'market-stats' => App\Http\Controllers\Admin\MarketStatisticController::class,
        'competitors' => App\Http\Controllers\Admin\CompetitorController::class,
        'milestones' => App\Http\Controllers\Admin\DevelopmentMilestoneController::class,
        'team' => App\Http\Controllers\Admin\TeamMemberController::class,
        'gallery' => App\Http\Controllers\Admin\GalleryItemController::class,
        'blog' => App\Http\Controllers\Admin\BlogPostController::class,
        'faqs' => App\Http\Controllers\Admin\FaqController::class,
        'risks' => App\Http\Controllers\Admin\RiskController::class,
        'investment-terms' => App\Http\Controllers\Admin\InvestmentTermController::class,
        'documents' => App\Http\Controllers\Admin\DueDiligenceDocumentController::class,
        'settings' => App\Http\Controllers\Admin\SiteSettingController::class,
    ];
    foreach($cruds as $prefix => $ctrl){
        Route::get("/$prefix", [$ctrl,'index'])->name("$prefix.index");
        Route::get("/$prefix/create", [$ctrl,'create'])->name("$prefix.create");
        Route::post("/$prefix", [$ctrl,'store'])->name("$prefix.store");
        Route::get("/$prefix/{id}/edit", [$ctrl,'edit'])->name("$prefix.edit");
        Route::put("/$prefix/{id}", [$ctrl,'update'])->name("$prefix.update");
        Route::delete("/$prefix/{id}", [$ctrl,'destroy'])->name("$prefix.destroy");
    }
    Route::get('/audit-logs', function(){
        $logs = App\Models\AuditLog::with('user')->latest()->paginate(20);
        return view('admin.audit.index', compact('logs'));
    })->name('audit.index');
});

Route::get('/sitemap.xml', function(){
    $urls = ['/','/opportunity','/property','/resort','/market','/investment','/financials','/development','/team','/gallery','/faq','/contact'];
    $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach($urls as $u){ $xml .= '<url><loc>'.url($u).'</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>'; }
    $xml .= '</urlset>';
    return response($xml,200)->header('Content-Type','text/xml');
});
Route::get('/robots.txt', function(){
    return response("User-agent: *\nAllow: /\nSitemap: ".url('/sitemap.xml'),200)->header('Content-Type','text/plain');
});
