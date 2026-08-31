<?php
namespace App\Http\Controllers\Admin;
use Illuminate\Http\Request;
class CottageController extends CrudController {
    protected $model = \App\Models\Cottage::class;
    protected $viewPrefix = 'cottages';
    protected $routePrefix = 'cottages';
    protected $title = 'Cottage';
    protected $uploadFields = ['image'];
    protected function rules($id=null): array {
        return match('Cottage') {
            'FundingAllocation' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string|max:255','percentage'=>'required|numeric|min:0|max:100','amount'=>'required|integer|min:0','description_en'=>'nullable|string','description_bn'=>'nullable|string','color'=>'nullable|string','icon'=>'nullable|string','order'=>'nullable|integer'],
            'FinancialScenario' => ['name'=>'required|string|max:100','label_en'=>'required|string|max:255','label_bn'=>'nullable|string|max:255','rooms'=>'required|integer','adr'=>'required|integer','occupancy'=>'required|numeric','room_revenue'=>'nullable|integer','total_revenue'=>'nullable|integer','opex_percent'=>'required|integer','ebitda'=>'nullable|integer','net_profit'=>'nullable|integer','roi'=>'nullable|numeric','payback_years'=>'nullable|numeric','break_even_occupancy'=>'nullable|numeric','order'=>'nullable|integer'],
            'Cottage' => ['name_en'=>'required|string|max:255','name_bn'=>'nullable|string','type'=>'nullable|string','count'=>'required|integer','size'=>'nullable|string','price_range'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','image'=>'nullable|image|max:4096','features'=>'nullable|string','order'=>'nullable|integer','is_active'=>'nullable|boolean'],
            'ResortFacility' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','icon'=>'nullable|string','image'=>'nullable|image|max:4096','category'=>'nullable|string','order'=>'nullable|integer'],
            'Experience' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','image'=>'nullable|image|max:4096','category'=>'nullable|string','order'=>'nullable|integer'],
            'MasterplanZone' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','area'=>'nullable|string','percentage'=>'nullable|string','icon'=>'nullable|string','image'=>'nullable|image|max:4096','order'=>'nullable|integer'],
            'MarketStatistic' => ['metric_en'=>'required|string|max:255','metric_bn'=>'nullable|string','value'=>'required|string|max:255','source'=>'nullable|string','source_url'=>'nullable|url','category'=>'nullable|string','order'=>'nullable|integer'],
            'Competitor' => ['name'=>'required|string|max:255','location'=>'nullable|string','rooms'=>'nullable|string','price_range'=>'nullable|string','facilities'=>'nullable|string','target_customer'=>'nullable|string','rating'=>'nullable|string','strengths'=>'nullable|string','weaknesses'=>'nullable|string','usp'=>'nullable|string','source'=>'nullable|string','last_verified'=>'nullable|date','order'=>'nullable|integer'],
            'DevelopmentMilestone' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','phase'=>'nullable|string','start_date'=>'nullable|date','end_date'=>'nullable|date','status'=>'required|string','order'=>'nullable|integer','image'=>'nullable|image|max:4096'],
            'TeamMember' => ['name'=>'required|string|max:255','position_en'=>'required|string|max:255','position_bn'=>'nullable|string','bio_en'=>'nullable|string','bio_bn'=>'nullable|string','category'=>'required|string','photo'=>'nullable|image|max:4096','linkedin'=>'nullable|url','website'=>'nullable|url','order'=>'nullable|integer'],
            'GalleryItem' => ['title'=>'required|string|max:255','category'=>'required|string','image'=>'nullable|image|max:8192','video_url'=>'nullable|url','caption'=>'nullable|string','source_type'=>'required|string','source_url'=>'nullable|url','copyright_status'=>'nullable|string','is_featured'=>'nullable|boolean','is_published'=>'nullable|boolean','order'=>'nullable|integer'],
            'BlogPost' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','slug'=>'required|string|max:255|unique:blog_posts,slug'.($id ? ','.$id : ''), 'excerpt_en'=>'nullable|string','excerpt_bn'=>'nullable|string','content_en'=>'nullable|string','content_bn'=>'nullable|string','category'=>'nullable|string','thumbnail'=>'nullable|image|max:4096','seo_title'=>'nullable|string','meta_description'=>'nullable|string','author'=>'nullable|string','status'=>'required|string','published_at'=>'nullable|date'],
            'Faq' => ['question_en'=>'required|string|max:500','question_bn'=>'nullable|string','answer_en'=>'required|string','answer_bn'=>'nullable|string','category'=>'nullable|string','order'=>'nullable|integer','is_published'=>'nullable|boolean'],
            'Risk' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','category'=>'required|string','risk_en'=>'nullable|string','risk_bn'=>'nullable|string','impact_en'=>'nullable|string','impact_bn'=>'nullable|string','mitigation_en'=>'nullable|string','mitigation_bn'=>'nullable|string','verification_status'=>'nullable|string','severity'=>'required|string','order'=>'nullable|integer'],
            'InvestmentTerm' => ['title_en'=>'required|string|max:255','title_bn'=>'nullable|string','description_en'=>'nullable|string','description_bn'=>'nullable|string','value'=>'nullable|string','category'=>'nullable|string','order'=>'nullable|integer'],
            'DueDiligenceDocument' => ['title'=>'required|string|max:255','category'=>'required|string','version'=>'nullable|string','description'=>'nullable|string','file_path'=>'nullable|file|max:10240','visibility'=>'required|string','investor_access'=>'nullable|boolean','is_published'=>'nullable|boolean'],
            'SiteSetting' => ['key'=>'required|string|max:255','value_en'=>'nullable|string','value_bn'=>'nullable|string','type'=>'nullable|string'],
            default => [],
        };
    }
    // Override handleUploads for documents file_path
    protected function handleUploads(\Illuminate\Http\Request $request, $data, $existing=null){
        if('Cottage'==='DueDiligenceDocument' && $request->hasFile('file_path')){
             if($existing && $existing->file_path) \Illuminate\Support\Facades\Storage::disk('public')->delete($existing->file_path);
             $data['file_path']=$request->file('file_path')->store('documents','public');
             $data['file_name']=$request->file('file_path')->getClientOriginalName();
        } elseif(in_array('Cottage', ['DueDiligenceDocument'])) {
            unset($data['file_path']);
        }
        return parent::handleUploads($request,$data,$existing);
    }
}
