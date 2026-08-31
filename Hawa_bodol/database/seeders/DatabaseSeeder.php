<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\SiteSetting;
use App\Models\FundingAllocation;
use App\Models\FinancialScenario;
use App\Models\Cottage;
use App\Models\ResortFacility;
use App\Models\Experience;
use App\Models\MasterplanZone;
use App\Models\MarketStatistic;
use App\Models\Competitor;
use App\Models\DevelopmentMilestone;
use App\Models\TeamMember;
use App\Models\GalleryItem;
use App\Models\Faq;
use App\Models\Risk;
use App\Models\InvestmentTerm;
use App\Models\BlogPost;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email'=>'admin@hawabodol.com'], [
            'name'=>'Hawa Bodol Admin',
            'password'=>Hash::make('password'),
            'is_admin'=>true,
            'email_verified_at'=>now(),
        ]);
        User::updateOrCreate(['email'=>'test@example.com'], [
            'name'=>'Test User',
            'password'=>Hash::make('password'),
            'is_admin'=>false,
        ]);

        $settings = [
            ['key'=>'site_name','value_en'=>'হাওয়া বদল — Hawa Bodol','value_bn'=>'হাওয়া বদল'],
            ['key'=>'tagline_en','value_en'=>"A premium nature resort rooted in Bengal's heritage",'value_bn'=>'বাংলার ঐতিহ্যে প্রোথিত একটি প্রিমিয়াম প্রকৃতি রিসোর্ট'],
            ['key'=>'funding_target','value_en'=>'30000000','value_bn'=>'30000000'],
            ['key'=>'contact_email','value_en'=>'hello@hawabodol.com'],
            ['key'=>'contact_phone','value_en'=>'+880 1XXX-XXXXXX'],
            ['key'=>'office_address','value_en'=>'Ruposhi Para / Lama, Bandarban'],
            ['key'=>'disclaimer_en','value_en'=>'This website presents information about a proposed hospitality development opportunity. Any financial projections are indicative and subject to change. Nothing constitutes a guarantee, public offer, investment advice, or binding commitment. Independent due diligence required.'],
            ['key'=>'disclaimer_bn','value_bn'=>'এই ওয়েবসাইট একটি প্রস্তাবিত হসপিটালিটি উন্নয়ন সুযোগ সম্পর্কে তথ্য উপস্থাপন করে। আর্থিক অনুমান নির্দেশক।'],
        ];
        foreach($settings as $s) SiteSetting::updateOrCreate(['key'=>$s['key']], $s);

        if(FundingAllocation::count()==0){
            $allocs = [
                ['title_en'=>'Construction','title_bn'=>'নির্মাণ','percentage'=>60,'amount'=>18000000,'description_en'=>'Cottages, civil, structure','color'=>'#1a3a2a','icon'=>'🏗️','order'=>1],
                ['title_en'=>'Resort Facilities','percentage'=>20,'amount'=>6000000,'description_en'=>'Restaurant, pool, deck, trails','color'=>'#c9a961','icon'=>'🏡','order'=>2],
                ['title_en'=>'Landscaping','percentage'=>7,'amount'=>2100000,'description_en'=>'Gardens, trails, riverfront','order'=>3],
                ['title_en'=>'Utilities','percentage'=>5,'amount'=>1500000,'description_en'=>'Power, water, waste treatment','order'=>4],
                ['title_en'=>'Professional & Legal','percentage'=>4,'amount'=>1200000,'description_en'=>'Lawyer, architect, approvals','order'=>5],
                ['title_en'=>'Working Capital','percentage'=>4,'amount'=>1200000,'description_en'=>'Pre-opening, 6 months buffer','order'=>6],
                ['title_en'=>'Contingency','percentage'=>10,'amount'=>3000000,'description_en'=>'Cost overruns','order'=>7],
            ];
            foreach($allocs as $a) FundingAllocation::create($a);
        }

        if(FinancialScenario::count()==0){
            $scenarios = [
                ['name'=>'conservative','label_en'=>'Conservative','label_bn'=>'রক্ষণশীল','rooms'=>18,'adr'=>8000,'occupancy'=>45,'room_revenue'=>23652000,'restaurant_revenue'=>4730400,'activity_revenue'=>2365200,'total_revenue'=>30747600,'opex_percent'=>60,'ebitda'=>12299040,'net_profit'=>9224280,'roi'=>31,'payback_years'=>6.5,'break_even_occupancy'=>35,'order'=>1],
                ['name'=>'base','label_en'=>'Base Case','label_bn'=>'ভিত্তি','rooms'=>18,'adr'=>10000,'occupancy'=>55,'room_revenue'=>36135000,'restaurant_revenue'=>9033750,'activity_revenue'=>5420250,'total_revenue'=>50589000,'opex_percent'=>55,'ebitda'=>20295000,'net_profit'=>15221250,'roi'=>51,'payback_years'=>4.0,'break_even_occupancy'=>30,'order'=>2],
                ['name'=>'optimistic','label_en'=>'Optimistic','label_bn'=>'আশাবাদী','rooms'=>18,'adr'=>12000,'occupancy'=>65,'room_revenue'=>51282000,'restaurant_revenue'=>15384600,'activity_revenue'=>10256400,'total_revenue'=>61500000,'opex_percent'=>50,'ebitda'=>30750000,'net_profit'=>23062500,'roi'=>77,'payback_years'=>2.6,'break_even_occupancy'=>25,'order'=>3],
            ];
            foreach($scenarios as $s) FinancialScenario::create($s);
        }

        if(Cottage::count()==0){
            $cottages=[
                ['name_en'=>'River-View Villa (1BR)','name_bn'=>'নদী-ভিউ ভিলা','type'=>'Villa','count'=>6,'size'=>'500–600 sq ft','price_range'=>'BDT 12,000–15,000','description_en'=>'River-facing, private deck, Bengali-inspired interiors','order'=>1],
                ['name_en'=>'Mountain-View Cottage (1BR)','type'=>'Cottage','count'=>6,'size'=>'450–550 sq ft','price_range'=>'BDT 10,000–13,000','description_en'=>'Mountain views, handcrafted wood furniture','order'=>2],
                ['name_en'=>'Family Suite (2BR)','type'=>'Family','count'=>4,'size'=>'800–1,000 sq ft','price_range'=>'BDT 15,000–20,000','description_en'=>'Two bedrooms, living area, courtyard','order'=>3],
                ['name_en'=>'Premium Suite (1BR + Living)','type'=>'Premium','count'=>2,'size'=>'700–800 sq ft','price_range'=>'BDT 18,000–25,000','description_en'=>'Premium suite with separate living, valley view','order'=>4],
            ];
            foreach($cottages as $c) Cottage::create($c);
        }

        if(ResortFacility::count()==0){
            $facs=[
                ['title_en'=>'Riverside Restaurant','title_bn'=>'নদী তীরের রেস্তোরাঁ','description_en'=>'50–70 seats, Bengali cuisine, local ingredients, river/mountain views','category'=>'Dining','icon'=>'🍽️','order'=>1],
                ['title_en'=>'Infinity Pool','description_en'=>'Panoramic valley view — where technically feasible, with safety and hydrology review','category'=>'Wellness','icon'=>'🏊','order'=>2],
                ['title_en'=>'River Dock & Kayak','description_en'=>'Canoe/kayak, riverside dining, sunset — 30–50m setback, BWDB guidelines','category'=>'Experience','icon'=>'🛶','order'=>3],
                ['title_en'=>'Viewing Deck','description_en'=>'Observation tower for sunrise/sunset and photography','category'=>'Experience','icon'=>'🔭','order'=>4],
                ['title_en'=>'Bonfire & Outdoor Dining','description_en'=>'Curated bonfire, outdoor dining — high guest satisfaction, low cost','category'=>'Experience','icon'=>'🔥','order'=>5],
                ['title_en'=>'Event & Retreat Area','description_en'=>'50–100 people, corporate retreats — 10–15% revenue potential','category'=>'Events','icon'=>'🎪','order'=>6],
            ];
            foreach($facs as $f) ResortFacility::create($f);
        }

        if(Experience::count()==0){
            foreach(['River Experiences','Guided Nature Walks','Sunrise/Sunset Points','Photography','Traditional Food','Folk Craftsmanship','Courtyard Slow-Living','Birdwatching'] as $i=>$t){
                Experience::create(['title_en'=>$t,'description_en'=>'Curated, respectful, low-impact experience','category'=>'Nature','order'=>$i+1]);
            }
        }

        if(MasterplanZone::count()==0){
            $zones=[
                ['title_en'=>'Cottages (18)','area'=>'4–5 bigha','percentage'=>'20–25%','description_en'=>'Low-density, 2,500–3,000 sq ft per cottage incl. setback'],
                ['title_en'=>'Restaurant, Pool, Common','area'=>'2–3 bigha','percentage'=>'10–15%','description_en'=>'Central, river/mountain view'],
                ['title_en'=>'Parking, Reception, Staff','area'=>'1–2 bigha','percentage'=>'5–10%','description_en'=>'Near entrance, service road'],
                ['title_en'=>'Landscape & Trails','area'=>'5–6 bigha','percentage'=>'25–30%','description_en'=>'Native plants, walking trails'],
                ['title_en'=>'Riverfront','area'=>'2–3 bigha','percentage'=>'10–15%','description_en'=>'Dock, kayaking, 30–50m setback'],
                ['title_en'=>'Conservation','area'=>'6–8 bigha','percentage'=>'30–35%','description_en'=>'Forested, biodiversity, carbon sink'],
                ['title_en'=>'Future Expansion','area'=>'2–3 bigha','percentage'=>'10–15%','description_en'=>'Phase 2: +10 cottages'],
            ];
            foreach($zones as $i=>$z) MasterplanZone::create(array_merge($z,['order'=>$i+1]));
        }

        if(MarketStatistic::count()==0){
            $stats=[
                ['metric_en'=>'Domestic tourist trips (annual)','value'=>'~9 million','source'=>'Bangladesh Parjaton Corporation','category'=>'Tourism'],
                ['metric_en'=>'Bandarban position','value'=>'Top 3 hill destination','source'=>'Industry consensus','category'=>'Tourism'],
                ['metric_en'=>'Premium ceiling','value'=>'BDT 12,000–25,000/night','source'=>'Competitor survey','category'=>'Pricing'],
                ['metric_en'=>'Mid-market cluster','value'=>'BDT 3,000–8,000/night','source'=>'Competitor survey','category'=>'Pricing'],
                ['metric_en'=>'High-income travelers','value'=>'10–15% willing BDT 8k–20k','source'=>'Industry estimate','category'=>'Demand'],
            ];
            foreach($stats as $i=>$s) MarketStatistic::create(array_merge($s,['order'=>$i+1]));
        }

        if(Competitor::count()==0){
            $comps=[
                ['name'=>'Sairu Hill Resort','location'=>'Bandarban Sadar','rooms'=>'20–25','price_range'=>'12k–25k','facilities'=>'Pool, restaurant, mountain view','target_customer'=>'High-income families','rating'=>'4.3','usp'=>'Hilltop luxury','order'=>1],
                ['name'=>'Green Peak Resorts','location'=>'Chittagong–Bandarban Hwy','rooms'=>'30–35','price_range'=>'8k–15k','facilities'=>'Pool, restaurant, AC','target_customer'=>'Families','rating'=>'4.1','usp'=>'Pool + mountain view','order'=>2],
                ['name'=>'Labah Tong Hill Resort','location'=>'Kutum Valley','rooms'=>'15–20','price_range'=>'10k–18k','facilities'=>'Pool, valley views','target_customer'=>'Couples','rating'=>'4.3','usp'=>'Valley luxury','order'=>3],
                ['name'=>'Boisabi Resort','location'=>'Lama/Remote Hills','rooms'=>'10–15','price_range'=>'6k–12k','facilities'=>'Eco-lodge, river access','target_customer'=>'Nature lovers','rating'=>'4.4','usp'=>'Remote eco-lodge','order'=>4],
            ];
            foreach($comps as $c) Competitor::create($c);
        }

        if(DevelopmentMilestone::count()==0){
            $miles=[
                ['title_en'=>'Legal, Design & Documentation','phase'=>'Phase 1','description_en'=>'Land verification, lawyer, architect, SPV structuring','status'=>'pending','order'=>1],
                ['title_en'=>'Regulatory Approvals','phase'=>'Phase 2','description_en'=>'Hill District NOC, DoE ECC, building permission, tourism registration','status'=>'pending','order'=>2],
                ['title_en'=>'Infrastructure & Utilities','phase'=>'Phase 3','description_en'=>'Road, water, power, waste treatment, drainage','status'=>'pending','order'=>3],
                ['title_en'=>'Cottages, Restaurant & Pool','phase'=>'Phase 4','description_en'=>'18 cottages, 50–70 seat restaurant, pool (if feasible)','status'=>'pending','order'=>4],
                ['title_en'=>'Landscape & Experiences','phase'=>'Phase 5','description_en'=>'Gardens, trails, river dock, cultural zones, conservation','status'=>'pending','order'=>5],
                ['title_en'=>'Soft Launch & Full Operation','phase'=>'Phase 6','description_en'=>'Staff training, trial stays, opening, quarterly reporting','status'=>'pending','order'=>6],
            ];
            foreach($miles as $m) DevelopmentMilestone::create($m);
        }

        if(TeamMember::count()==0){
            $team=[
                ['name'=>'Founder — To be disclosed','position_en'=>'Founder','bio_en'=>'Project vision and leadership — details on request for qualified investors','category'=>'founder','order'=>1],
                ['name'=>'Advisor to be appointed','position_en'=>'Legal Advisor','bio_en'=>'Hill District land law specialist — to be appointed before fundraising','category'=>'legal','order'=>2],
                ['name'=>'Advisor to be appointed','position_en'=>'Architect','bio_en'=>'Masterplan and 3D visualization — to be appointed','category'=>'architect','order'=>3],
                ['name'=>'Advisor to be appointed','position_en'=>'Financial Advisor','bio_en'=>'Financial model, SPV, reporting — to be appointed','category'=>'financial','order'=>4],
            ];
            foreach($team as $t) TeamMember::create($t);
        }

        if(GalleryItem::count()==0){
            $cats=['site','concept','nature','culture'];
            for($i=1;$i<=8;$i++){
                GalleryItem::create([
                    'title'=>'Bandarban Landscape — Reference '.$i,
                    'category'=>$cats[$i%4],
                    'caption'=>'Reference image — source: Unsplash CC0. Actual site photos via admin.',
                    'source_type'=>'reference',
                    'source_url'=>'https://unsplash.com',
                    'is_published'=>true,
                    'order'=>$i,
                ]);
            }
        }

        if(Faq::count()==0){
            $faqs=[
                ['question_en'=>'What is Hawa Bodol?','answer_en'=>'A premium nature resort concept on 21 bigha in Ruposhi Para/Lama, Bandarban — heritage-inspired, riverfront, low-density (~18 cottages). Indicative, subject to approvals.'],
                ['question_en'=>'Where is the property?','answer_en'=>'Ruposhi Para/Lama, Lama Upazila, Bandarban — Chittagong–Bandarban highway, Matamuhuri River on one side, hills on the other. 5–10km from Lama, 30–35km from Bandarban town.'],
                ['question_en'=>'How large is the property?','answer_en'=>'21 bigha. Conceptual masterplan: 15–25 cottages on 5–7 bigha, remainder landscape/conservation/future expansion.'],
                ['question_en'=>'What is total fundraising requirement?','answer_en'=>'BDT 3 crore — indicative target, editable via admin. Construction, facilities, landscaping, utilities, working capital, professional/legal, contingency.'],
                ['question_en'=>'What is investment structure?','answer_en'=>'Proposed Project Company/SPV — investors own equity in dedicated company. Ring-fenced liability. Subject to final legal documentation.'],
                ['question_en'=>'Is land legally verified?','answer_en'=>'40-year registration — requires lawyer verification of deed, mutation, khatian, encumbrance, inheritance, Hill/forest classification. Summary for qualified investors.'],
                ['question_en'=>'What approvals are required?','answer_en'=>'Building permission (Union/Upazila + Hill District NOC), DoE Environmental Clearance, Forest clearance if applicable, tourism registration, fire safety, trade license, VAT/TIN.'],
                ['question_en'=>'What are major risks?','answer_en'=>'Land title, regulatory delays, flooding/erosion/landslide, seasonal demand, cost overruns. Each with mitigation — see Risk page.'],
                ['question_en'=>'How will investors receive reports?','answer_en'=>'Intended: quarterly project update + financials, budget vs actual, milestones, risks, annual meeting. No claim of audited reports unless they exist.'],
                ['question_en'=>'Can investors visit the site?','answer_en'=>'Yes — Schedule a Site Visit via website. Statuses: pending/confirmed/completed/cancelled.'],
            ];
            foreach($faqs as $i=>$f) Faq::create(array_merge($f,['category'=>'Investment','order'=>$i+1,'is_published'=>true]));
        }

        if(Risk::count()==0){
            $risks=[
                ['title_en'=>'Title / Mutation / Encumbrance','category'=>'land','risk_en'=>'40-yr registration needs verification','impact_en'=>'Litigation, delay','mitigation_en'=>'Lawyer verification, encumbrance cert','severity'=>'high','verification_status'=>'pending','order'=>1],
                ['title_en'=>'Hill District & DoE Approvals','category'=>'regulatory','risk_en'=>'NOC, ECC, building permission required','impact_en'=>'Halted construction','mitigation_en'=>'Checklist, Council engagement before fundraising','severity'=>'high','verification_status'=>'pending','order'=>2],
                ['title_en'=>'Flooding & Erosion','category'=>'environmental','risk_en'=>'Monsoon flood, river erosion','impact_en'=>'Property damage','mitigation_en'=>'Hydrologist, 3–5m elevation, 30–50m setback','severity'=>'high','verification_status'=>'pending','order'=>3],
                ['title_en'=>'Seasonal Occupancy','category'=>'market','risk_en'=>'Monsoon 20–35% occupancy','impact_en'=>'Cash flow gaps','mitigation_en'=>'Conservative modeling, working capital 6 months','severity'=>'medium','verification_status'=>'pending','order'=>4],
                ['title_en'=>'Cost Overruns','category'=>'construction','risk_en'=>'Construction delays, price inflation','impact_en'=>'Budget breach','mitigation_en'=>'Fixed-price contract, 10–15% contingency','severity'=>'medium','verification_status'=>'pending','order'=>5],
            ];
            foreach($risks as $r) Risk::create($r);
        }

        if(InvestmentTerm::count()==0){
            InvestmentTerm::create(['title_en'=>'Project Company / SPV','description_en'=>'Investors participate through dedicated project company. Ring-fenced liability, clear governance. Subject to final legal structuring.','category'=>'Structure','order'=>1]);
            InvestmentTerm::create(['title_en'=>'Minimum Investment','value'=>'BDT 10 lakh','description_en'=>'Editable via admin','category'=>'Terms','order'=>2]);
        }

        if(BlogPost::count()==0){
            BlogPost::create(['title_en'=>'Why Hawa Bodol — Heritage Meets Hospitality','slug'=>'why-hawa-bodol','excerpt_en'=>'The story behind the Bengal heritage resort concept','content_en'=>"Hawa Bodol aims to recreate medieval Bengali rural life through courtyard architecture, handcrafted furniture, and slow hospitality.\n\nAll imagery labelled as actual/concept/reference. No exploitation of indigenous communities — only consent-based participation.",'category'=>'Project Updates','status'=>'published','published_at'=>now(),'author'=>'Hawa Bodol Team']);
        }
    }
}
