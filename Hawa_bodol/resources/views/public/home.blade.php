@extends('layouts.app')
@section('title','হাওয়া বদল — Premium Nature Resort Investment | 21 Bigha • BDT 3 Crore')
@section('content')
<!-- Hero -->
<section class="relative overflow-hidden">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80" class="w-full h-full object-cover" alt="Bandarban hills - concept visualization">
    <div class="absolute inset-0 bg-gradient-to-t from-[#0f1f14]/85 via-[#1a3a2a]/35 to-[#1a3a2a]/10"></div>
  </div>
  <div class="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
    <div class="max-w-3xl">
      <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1.5 text-xs text-white">
        <span class="w-2 h-2 bg-[#c9a961] rounded-full animate-pulse"></span> 21 Bigha • Matamuhuri Riverfront • Bandarban
        <span class="hidden sm:inline">• BDT 3 Crore Development Opportunity</span>
      </div>
      <h1 class="mt-6 font-bn text-[30px] sm:text-[42px] lg:text-[52px] font-bold leading-[1.1] text-white">একটু দূরে নয়—<br><span class="text-[#c9a961]">একটি অন্যরকম জীবনের কাছে।</span></h1>
      <p class="mt-4 text-[18px] lg:text-[20px] font-display italic text-white/90">Where Bengal's heritage meets river, mountain and refined hospitality.</p>
      <p class="mt-4 text-sm leading-relaxed text-white/80 max-w-[560px]">A thoughtfully planned low-density resort on 21 bigha of riverfront land in Ruposhi Para/Lama — designed for guests seeking slow living, cultural immersion, and nature, and for investors seeking a defensible premium hospitality asset.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="{{ route('investor.inquiry') }}" class="bg-[#c9a961] text-[#0f1f14] px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-[#d8b978] transition shadow">Become an Investor →</a>
        <a href="{{ route('property') }}" class="bg-white/10 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-full font-medium text-sm hover:bg-white hover:text-[#1a3a2a] transition">Explore the Resort</a>
        <a href="{{ route('contact') }}" class="hidden sm:inline-flex items-center gap-2 bg-white text-[#1a3a2a] px-7 py-3.5 rounded-full font-medium text-sm hover:bg-[#f5f1e8] transition">Schedule a Site Visit</a>
      </div>
      <div class="mt-6 flex items-center gap-3 text-xs text-white/70">
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> SPV structure • Transparent reporting</span>
        <span class="hidden sm:inline">•</span>
        <span class="hidden sm:inline">Indicative projections — not guaranteed</span>
      </div>
    </div>
  </div>
  <!-- Investment summary bar -->
  <div class="relative bg-[#0f1f14] border-t border-[#1f3320]">
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
      @php $bars=[['21 Bigha','Private riverfront land'],['Matamuhuri River','Direct frontage + views'],['~18 Cottages','Low-density masterplan'],['BDT 3 Crore','Fundraising target — Indicative']]; @endphp
      @foreach($bars as [$t,$d])
        <div class="flex gap-3">
          <div class="w-9 h-9 rounded bg-[#1f3320] border border-[#2a4a2a] flex items-center justify-center text-[#c9a961] text-xs">◆</div>
          <div><div class="text-white font-semibold text-sm">{{ $t }}</div><div class="text-xs text-[#8a9a8a]">{{ $d }}</div></div>
        </div>
      @endforeach
    </div>
  </div>
</section>

<!-- Trust strip -->
<section class="bg-[#f5f1e8] border-y border-[#e8e0d0]">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-3 items-center justify-between">
    <div class="text-xs font-medium tracking-widest uppercase text-[#8b6f47]">Investor-Focused • Document-Verified • Risk-Disclosed</div>
    <div class="flex flex-wrap gap-2 text-xs">
      <span class="bg-white border border-[#e8e0d0] px-3 py-1.5 rounded-full">Land docs — lawyer-verified (on request)</span>
      <span class="bg-white border border-[#e8e0d0] px-3 py-1.5 rounded-full">Conservative modeling: 45–55% occupancy</span>
      <span class="bg-white border border-[#e8e0d0] px-3 py-1.5 rounded-full">SPV • Quarterly reporting</span>
    </div>
  </div>
</section>

<!-- Story -->
<section class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
  <div class="grid lg:grid-cols-2 gap-10 items-center">
    <div class="reveal">
      <div class="text-xs tracking-[0.2em] uppercase text-[#8b6f47] font-medium">Why Hawa Bodol Exists</div>
      <h2 class="mt-3 font-display text-[28px] lg:text-[36px] font-bold leading-tight text-[#1a3a2a]">A pause from urban life — <span class="text-[#8b6f47]">rooted in Bengal.</span></h2>
      <p class="mt-4 text-[15px] leading-relaxed text-[#4a5a4a]">Hawa Bodol is not a generic hotel. It is a culturally immersive nature retreat where guests temporarily leave fast urban life to experience Bengal's medieval rural aesthetics — courtyard architecture, handcrafted furniture, folk craftsmanship, river and hills, slow food and quiet hospitality.</p>
      <div class="mt-6 grid sm:grid-cols-2 gap-3">
        @php $pts=[['Heritage Courtyard','Brick, wood & jute — Bengali vernacular reimagined'],['River & Hills','Matamuhuri frontage + terraced mountain views'],['Slow Food','Local ingredients, Bengali cuisine, riverside dining'],['Craft & Culture','Respectful, consent-based community experiences']]; @endphp
        @foreach($pts as [$t,$d])
          <div class="bg-white border border-[#e8e0d0] rounded-xl p-4">
            <div class="font-medium text-sm text-[#1a3a2a]">{{ $t }}</div><div class="text-xs leading-relaxed text-[#6a7a6a] mt-1">{{ $d }}</div>
          </div>
        @endforeach
      </div>
      <p class="mt-4 text-xs text-[#8a9a8a]">Mru/Murong cultural experiences — only with consent, fair compensation, and community participation. No exploitation or romanticization.</p>
      <a href="/resort" class="inline-flex mt-6 bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#0f281c]">Discover the Resort Concept →</a>
    </div>
    <div class="reveal grid grid-cols-2 gap-3">
      <img src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=80" class="rounded-2xl h-[320px] w-full object-cover" alt="River landscape - reference">
      <img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80" class="rounded-2xl h-[320px] w-full object-cover" alt="Forest - reference">
      <img src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80" class="rounded-2xl h-[200px] w-full object-cover col-span-2" alt="Resort dining - concept visualization">
      <div class="col-span-2 bg-[#1a3a2a] rounded-2xl p-5 flex justify-between items-center">
        <div><div class="text-[#c9a961] font-display text-xl font-bold">“হাওয়া বদল”</div><div class="text-xs text-white/70">Concept visualization • Actual photos via admin</div></div>
        <div class="text-right"><div class="text-white font-bold text-lg">21 Bigha</div><div class="text-xs text-white/60">Low-density • Conservation-minded</div></div>
      </div>
    </div>
  </div>
</section>

<!-- Property teaser -->
<section class="bg-white border-y border-[#e8e0d0]">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <div class="flex flex-wrap justify-between gap-4 items-end">
      <div>
        <div class="text-xs tracking-[0.2em] uppercase text-[#8b6f47]">The Property</div>
        <h2 class="font-display text-2xl lg:text-3xl font-bold text-[#1a3a2a] mt-1">21 Bigha on the Matamuhuri</h2>
        <p class="text-sm text-[#6a7a6a] mt-2 max-w-xl">River on one side, hills on the other, road access, existing structure, and space for a low-density masterplan.</p>
      </div>
      <a href="/property" class="border border-[#1a3a2a] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#1a3a2a] hover:text-white transition">View Property →</a>
    </div>
    <div class="mt-8 grid lg:grid-cols-3 gap-4">
      @php $cards=[['River Frontage','Unique selling point — dock, kayaking, riverside dining. 30–50m setback, hydrologist review.','https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600'],['Mountain Terrain','Terraced cottages, infinity pool valley views. Geotechnical survey required.','https://images.unsplash.com/photo-1464822759844-d150baec0494?w=600'],['Road Access','Chittagong–Bandarban highway. Lama 5–10km, Bandarban town 30km.','https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600']]; @endphp
      @foreach($cards as [$t,$d,$img])
        <div class="group overflow-hidden rounded-2xl border border-[#e8e0d0] bg-[#fdfcf8]">
          <div class="h-44 overflow-hidden"><img src="{{ $img }}" class="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="{{ $t }}"></div>
          <div class="p-5"><h3 class="font-medium text-[#1a3a2a]">{{ $t }}</h3><p class="text-xs leading-relaxed text-[#6a7a6a] mt-1">{{ $d }}</p></div>
        </div>
      @endforeach
    </div>
    <div class="mt-4 text-xs text-[#8a9a8a]">Conceptual allocation — subject to architectural, environmental and regulatory approval.</div>
  </div>
</section>

<!-- Resort facilities -->
<section class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
  <div class="text-center max-w-2xl mx-auto">
    <div class="text-xs tracking-[0.2em] uppercase text-[#8b6f47]">Resort Concept</div>
    <h2 class="font-display text-2xl lg:text-3xl font-bold text-[#1a3a2a] mt-2">18 Cottages • Restaurant • Pool • River Experiences</h2>
    <p class="text-sm text-[#6a7a6a] mt-3">Indicative concept — final design subject to approvals. Every facility editable from admin.</p>
  </div>
  <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    @foreach($facilities as $f)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
        <div class="w-10 h-10 rounded bg-[#f5f1e8] border border-[#e8e0d0] flex items-center justify-center text-[#8b6f47] text-sm">{{ $f->icon ?? '◆' }}</div>
        <h3 class="font-medium mt-3 text-[#1a3a2a]">{{ $f->title_en }}</h3>
        <p class="text-xs text-[#6a7a6a] mt-1 leading-relaxed">{{ \Illuminate\Support\Str::limit($f->description_en,110) }}</p>
      </div>
    @endforeach
    @if($facilities->isEmpty())
      @php $fallback=[['River-View Villa','500–600 sq ft • 12k–15k/night'],['Mountain Cottage','450–550 sq ft • 10k–13k/night'],['Family Suite (2BR)','800–1000 sq ft • 15k–20k/night'],['Riverside Restaurant','50–70 seats • Bengali cuisine'],['Infinity Pool','Valley view — technical feasibility review'],['Bonfire & Trails','Guided walks, photography, sunrise']]; @endphp
      @foreach($fallback as [$t,$d])
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5"><h3 class="font-medium text-[#1a3a2a]">{{ $t }}</h3><p class="text-xs text-[#6a7a6a] mt-1">{{ $d }}</p></div>
      @endforeach
    @endif
  </div>
  <div class="text-center mt-6"><a href="/resort" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm">Explore All Facilities →</a></div>
</section>

<!-- Funding -->
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <div class="grid lg:grid-cols-2 gap-10 items-center">
      <div>
        <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">An Opportunity to Build Something Exceptional</div>
        <h2 class="font-display text-[28px] font-bold mt-2 leading-tight">BDT 3 Crore<br>Development Opportunity</h2>
        <p class="text-sm leading-relaxed text-white/70 mt-3">Target capital for phased construction — cottages, restaurant, pool, landscape, utilities, and working capital. All allocations editable from admin. Investment terms subject to final legal documentation.</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          @foreach($fundings->take(4) as $f)
            <div class="bg-white/5 border border-white/10 rounded-xl p-4">
              <div class="text-[#c9a961] font-bold text-lg">{{ $f->percentage }}%</div>
              <div class="text-sm font-medium">{{ $f->title_en }}</div>
              <div class="text-xs text-white/60">BDT {{ number_format($f->amount) }}</div>
            </div>
          @endforeach
          @if($fundings->isEmpty())
            <div class="bg-white/5 border border-white/10 rounded-xl p-4"><div class="text-[#c9a961] font-bold">60%</div><div class="text-sm">Construction</div><div class="text-xs text-white/60">BDT 1.8 Cr</div></div>
            <div class="bg-white/5 border border-white/10 rounded-xl p-4"><div class="text-[#c9a961] font-bold">20%</div><div class="text-sm">Facilities</div><div class="text-xs text-white/60">BDT 60 Lakh</div></div>
            <div class="bg-white/5 border border-white/10 rounded-xl p-4"><div class="text-[#c9a961] font-bold">10%</div><div class="text-sm">Working Capital</div><div class="text-xs text-white/60">BDT 30 Lakh</div></div>
            <div class="bg-white/5 border border-white/10 rounded-xl p-4"><div class="text-[#c9a961] font-bold">10%</div><div class="text-sm">Contingency</div><div class="text-xs text-white/60">BDT 30 Lakh</div></div>
          @endif
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <a href="/investment" class="bg-[#c9a961] text-[#0f1f14] px-6 py-3 rounded-full text-sm font-semibold">View Use of Funds →</a>
          <a href="/financials" class="border border-white/20 px-6 py-3 rounded-full text-sm">Financial Model</a>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-6 text-[#1a2a1a]">
        <h3 class="font-display font-bold text-lg">Request Investor Deck</h3>
        <p class="text-xs text-[#6a7a6a] mt-1">Submitting does not constitute an investment commitment.</p>
        <form method="POST" action="{{ route('deck.request') }}" class="mt-4 space-y-3">
          @csrf
          <input name="name" required placeholder="Full Name" class="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a3a2a]">
          <div class="grid grid-cols-2 gap-3">
            <input name="email" type="email" required placeholder="Email" class="border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm">
            <input name="phone" required placeholder="Phone" class="border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm">
          </div>
          <input name="company" placeholder="Company (optional)" class="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm">
          <select name="investment_range" class="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="">Investment Range</option>
            <option>Below BDT 10 lakh</option>
            <option>BDT 10–25 lakh</option>
            <option>BDT 25–50 lakh</option>
            <option>BDT 50 lakh–1 crore</option>
            <option>BDT 1 crore+</option>
          </select>
          <button type="submit" class="w-full bg-[#1a3a2a] text-white py-3 rounded-full text-sm font-medium hover:bg-[#0f281c]">Request Deck →</button>
          <p class="text-[11px] text-center text-[#8a9a8a]">By submitting, you agree to our <a href="/privacy" class="underline">Privacy</a> & <a href="/disclaimer" class="underline">Disclaimer</a>.</p>
        </form>
      </div>
    </div>
  </div>
</section>

<!-- Financial teaser -->
<section class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
  <div class="flex flex-wrap justify-between gap-4 items-end">
    <div><div class="text-xs tracking-[0.2em] uppercase text-[#8b6f47]">Financial Model</div><h2 class="font-display text-2xl font-bold text-[#1a3a2a] mt-1">Conservative • Base • Optimistic</h2></div>
    <a href="/financials" class="text-sm border border-[#e8e0d0] px-5 py-2.5 rounded-full bg-white">View Detailed Model →</a>
  </div>
  <div class="mt-6 grid lg:grid-cols-3 gap-4">
    @foreach($scenarios as $s)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6 {{ $s->name=='base' ? 'ring-2 ring-[#c9a961] ring-offset-2' : '' }}">
        <div class="text-xs tracking-widest uppercase {{ $s->name=='base' ? 'text-[#c9a961]' : 'text-[#8b6f47]' }}">{{ $s->label_en }} {{ $s->name=='base' ? '• Recommended' : '' }}</div>
        <div class="mt-2 flex items-baseline gap-2"><span class="text-3xl font-bold text-[#1a3a2a]">{{ $s->occupancy }}%</span><span class="text-xs text-[#6a7a6a]">occupancy</span></div>
        <div class="text-sm text-[#8b6f47]">BDT {{ number_format($s->adr) }} ADR • {{ $s->rooms }} rooms</div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div class="bg-[#f5f1e8] rounded-lg p-3"><div class="text-[#6a7a6a]">Total Revenue</div><div class="font-bold text-[#1a3a2a]">BDT {{ number_format($s->total_revenue/10000000,2) }} Cr</div></div>
          <div class="bg-[#f5f1e8] rounded-lg p-3"><div class="text-[#6a7a6a]">EBITDA</div><div class="font-bold text-[#1a3a2a]">BDT {{ number_format($s->ebitda/10000000,2) }} Cr</div></div>
          <div class="bg-[#1a3a2a] text-white rounded-lg p-3"><div class="text-white/70">ROI</div><div class="font-bold text-[#c9a961]">{{ $s->roi }}%</div></div>
          <div class="bg-[#1a3a2a] text-white rounded-lg p-3"><div class="text-white/70">Payback</div><div class="font-bold">{{ $s->payback_years }} yrs</div></div>
        </div>
        <div class="mt-3 text-[11px] text-[#8a9a8a]">Break-even {{ $s->break_even_occupancy }}% • Indicative — not guaranteed</div>
      </div>
    @endforeach
    @if($scenarios->isEmpty())
      @php $fallbackScenarios=[['Conservative',45,8000,'3.07','1.23',31,6.5],['Base Case',55,10000,'4.51','2.03',51,4.0],['Optimistic',65,12000,'6.15','3.08',77,2.6]]; @endphp
      @foreach($fallbackScenarios as [$label,$occ,$adr,$rev,$ebitda,$roi,$pay])
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6"><div class="text-xs uppercase tracking-widest text-[#8b6f47]">{{ $label }}</div><div class="text-3xl font-bold mt-2">{{ $occ }}%</div><div class="text-xs">BDT {{ number_format($adr) }} ADR — Rev BDT {{ $rev }} Cr — EBITDA {{ $ebitda }} Cr — ROI {{ $roi }}% — Payback {{ $pay }} yrs</div></div>
      @endforeach
    @endif
  </div>
  <p class="text-center text-xs text-[#8a9a8a] mt-4">All figures are projected and subject to final financial model. Independent advice recommended.</p>
</section>

<!-- Development timeline -->
<section class="bg-[#f5f1e8] border-y border-[#e8e0d0]">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
    <div class="flex justify-between items-end flex-wrap gap-4">
      <div><div class="text-xs tracking-[0.2em] uppercase text-[#8b6f47]">Development Plan</div><h2 class="font-display text-2xl font-bold text-[#1a3a2a] mt-1">From approvals to opening — phased & scalable</h2></div>
      <a href="/development" class="bg-white border border-[#e8e0d0] px-5 py-2.5 rounded-full text-sm">Full Timeline →</a>
    </div>
    <div class="mt-8 grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
      @php $phases=[['Phase 1','Legal + Design','3–4 months','pending'],['Phase 2','Approvals','2–3 months','pending'],['Phase 3','Infrastructure','4–5 months','pending'],['Phase 4','Cottages','6–8 months','pending'],['Phase 5','Landscape','2–3 months','pending'],['Phase 6','Soft Launch','1 month','pending']]; @endphp
      @foreach($phases as $i=>[$ph,$t,$d,$s])
        <div class="bg-white border border-[#e8e0d0] rounded-xl p-4 relative overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-[#1a3a2a] text-white flex items-center justify-center text-xs font-bold">{{ $i+1 }}</div>
          <div class="text-xs text-[#8b6f47] mt-3 font-medium">{{ $ph }}</div>
          <div class="text-sm font-semibold text-[#1a3a2a]">{{ $t }}</div>
          <div class="text-xs text-[#6a7a6a]">{{ $d }}</div>
          <div class="mt-3 text-[11px] px-2 py-1 rounded-full bg-[#f5f1e8] border border-[#e8e0d0] inline-block">{{ $s }}</div>
        </div>
      @endforeach
    </div>
  </div>
</section>

<!-- Gallery teaser -->
<section class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
  <div class="flex justify-between items-end">
    <h2 class="font-display text-2xl font-bold text-[#1a3a2a]">Site & Concept Gallery</h2>
    <a href="/gallery" class="text-sm border px-5 py-2.5 rounded-full">View Gallery →</a>
  </div>
  <div class="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
    @foreach($gallery->take(8) as $g)
      <div class="group relative overflow-hidden rounded-xl h-44">
        <img src="{{ $g->image ?? 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' }}" class="w-full h-full object-cover group-hover:scale-105 transition duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div class="absolute bottom-2 left-2 right-2">
          <div class="text-white text-xs font-medium">{{ $g->title }}</div>
          <div class="text-white/70 text-[10px]">{{ ucfirst($g->source_type) }} • {{ $g->category }}</div>
        </div>
      </div>
    @endforeach
    @if($gallery->isEmpty())
      @for($i=0;$i<8;$i++)
        <div class="h-44 rounded-xl bg-[#f5f1e8] border border-[#e8e0d0] overflow-hidden"><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80" class="w-full h-full object-cover"></div>
      @endfor
    @endif
  </div>
  <p class="text-xs text-[#8a9a8a] mt-3">All reference images clearly labelled. Actual site photos uploaded via admin.</p>
</section>

<!-- Trust & CTA -->
<section class="bg-[#0f1f14] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-8 items-center justify-between">
    <div>
      <h3 class="font-display text-xl font-bold">Ready to explore the opportunity?</h3>
      <p class="text-sm text-white/70 mt-1">Request the investor deck, schedule a site visit, or speak with the project team.</p>
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span class="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">Due diligence pack on request</span>
        <span class="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">SPV • Quarterly reporting</span>
        <span class="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">Site visits welcome</span>
      </div>
    </div>
    <div class="flex gap-3">
      <a href="{{ route('investor.deck') }}" class="border border-white/20 px-6 py-3 rounded-full text-sm">Request Deck</a>
      <a href="{{ route('investor.inquiry') }}" class="bg-[#c9a961] text-[#0f1f14] px-6 py-3 rounded-full text-sm font-semibold">Become an Investor →</a>
    </div>
  </div>
</section>

@if(session('success'))
  <div class="fixed bottom-20 right-4 bg-[#1a3a2a] text-white px-5 py-3 rounded-xl shadow-lg text-sm z-50">{{ session('success') }}</div>
@endif
@endsection
