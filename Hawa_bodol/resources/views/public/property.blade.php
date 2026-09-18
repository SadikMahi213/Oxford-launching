@extends('layouts.app')
@section('title','The Property — 21 Bigha Riverfront | Hawa Bodol')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">The Property</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">21 Bigha on the Matamuhuri</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Ruposhi Para / Lama, Bandarban — river on one side, hills on the other, road access, and space for a low-density, conservation-minded masterplan.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
        <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80" class="w-full h-[380px] object-cover" alt="Property river - reference">
        <div class="p-6">
          <h2 class="font-display font-bold text-lg text-[#1a3a2a]">Property Highlights</h2>
          <ul class="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> 21 bigha — enables 15–25 cottages low-density plan (concept: ~18)</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Matamuhuri River frontage — dock, kayaking, riverside dining potential</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Mountain / hilly terrain — terraced cottages, valley views</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Road access — Chittagong–Bandarban highway</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Nearby residential communities — labor & supply</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Proximity to Mru/Murong communities — respectful cultural tourism</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Existing house/building — temporary site office / staff use</li>
            <li class="flex gap-2"><span class="text-[#c9a961]">◆</span> Reportedly registered ~40 years — subject to verification</li>
          </ul>
          <p class="mt-4 text-xs text-[#8a9a8a]">Do not expose sensitive military installation details. Mention only general proximity where legally appropriate.</p>
        </div>
      </div>

      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-display font-bold text-[#1a3a2a]">Conceptual Masterplan — 21 Bigha Allocation</h3>
        <p class="text-xs text-[#8a9a8a] mt-1">Subject to architectural, environmental and regulatory approval.</p>
        <div class="mt-6 grid sm:grid-cols-2 gap-4">
          @forelse($zones as $z)
            <div class="border border-[#e8e0d0] rounded-xl p-4 bg-[#fdfcf8]">
              <div class="flex justify-between items-start">
                <h4 class="font-medium text-sm text-[#1a3a2a]">{{ $z->title_en }}</h4>
                <span class="text-xs bg-[#1a3a2a] text-white px-2 py-1 rounded-full">{{ $z->percentage ?? '' }} {{ $z->area ?? '' }}</span>
              </div>
              <p class="text-xs text-[#6a7a6a] mt-2 leading-relaxed">{{ $z->description_en }}</p>
            </div>
          @empty
            @php $zonesFallback=[['Cottages (18)','4–5 bigha','20–25%','Low-density, 2500–3000 sq ft per cottage incl. setback'],['Restaurant, Pool, Common','2–3 bigha','10–15%','Central, river/mountain view'],['Parking, Reception, Staff','1–2 bigha','5–10%','Near entrance, service road'],['Landscape & Trails','5–6 bigha','25–30%','Native plants, walking trails'],['Riverfront','2–3 bigha','10–15%','Dock, kayaking, 30–50m setback'],['Conservation','6–8 bigha','30–35%','Forested, biodiversity'],['Future Expansion','2–3 bigha','10–15%','Phase 2: +10 cottages']]; @endphp
            @foreach($zonesFallback as [$t,$a,$p,$d])
              <div class="border border-[#e8e0d0] rounded-xl p-4 bg-[#fdfcf8]"><div class="flex justify-between"><h4 class="font-medium text-sm">{{ $t }}</h4><span class="text-xs bg-[#1a3a2a] text-white px-2 py-1 rounded-full">{{ $p }}</span></div><p class="text-xs text-[#6a7a6a] mt-2">{{ $d }} • {{ $a }}</p></div>
            @endforeach
          @endforelse
        </div>
      </div>
    </div>
    <div class="space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Location</h3>
        <div class="mt-3 h-[260px] rounded-xl overflow-hidden border border-[#e8e0d0] bg-[#f5f1e8] flex items-center justify-center">
          <div class="text-center p-4">
            <div class="text-sm font-medium">Interactive Map</div>
            <div class="text-xs text-[#6a7a6a] mt-1">Google Maps embed — configure lat/lng via admin. Coordinates editable.</div>
            <a href="https://maps.google.com/?q=Ruposhi+Para+Lama+Bandarban" target="_blank" class="mt-3 inline-block bg-[#1a3a2a] text-white px-4 py-2 rounded-full text-xs">Open in Google Maps →</a>
            <div class="mt-3 text-[11px] text-[#8a9a8a]">Approx: Ruposhi Para/Lama, 5–10km from Lama Bazar, 30–35km from Bandarban town</div>
          </div>
        </div>
        <ul class="mt-4 text-xs space-y-2 text-[#4a5a4a]">
          <li class="flex justify-between"><span>Lama Town</span><span class="font-medium">5–10 km • 15–30 min</span></li>
          <li class="flex justify-between"><span>Bandarban Town</span><span class="font-medium">30–35 km • 1–1.5 hr</span></li>
          <li class="flex justify-between"><span>Chittagong</span><span class="font-medium">~60 km • 2.5 hr</span></li>
          <li class="flex justify-between"><span>Nilgiri</span><span class="font-medium">45–50 km</span></li>
        </ul>
      </div>
      <div class="bg-[#1a3a2a] rounded-2xl p-6 text-white">
        <h3 class="font-display font-bold">Due Diligence Status</h3>
        <p class="text-xs text-white/70 mt-1">Land documentation summary — full pack for qualified investors.</p>
        <ul class="mt-4 space-y-2 text-xs">
          <li class="flex justify-between border-b border-white/10 pb-2"><span>Registered deed</span><span class="text-[#c9a961]">Pending verification</span></li>
          <li class="flex justify-between border-b border-white/10 pb-2"><span>Mutation (namjari)</span><span class="text-[#c9a961]">Pending</span></li>
          <li class="flex justify-between border-b border-white/10 pb-2"><span>Khatian</span><span class="text-[#c9a961]">Pending</span></li>
          <li class="flex justify-between border-b border-white/10 pb-2"><span>Encumbrance</span><span class="text-[#c9a961]">Pending</span></li>
          <li class="flex justify-between"><span>Hill District clearances</span><span class="text-white/60">In progress</span></li>
        </ul>
        <a href="/investor-inquiry" class="mt-4 block text-center bg-[#c9a961] text-[#0f1f14] py-2.5 rounded-full text-sm font-semibold">Request Due Diligence Pack →</a>
      </div>
    </div>
  </div>
</div>
@endsection
