@extends('layouts.app')
@section('title','Market — Bandarban Tourism')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Market</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">Bandarban Tourism — Data & Gaps</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Seasonality, segments, competitor pricing. All figures include source and last-verified date. Indicative — not live pricing.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-[#e8e0d0]"><h3 class="font-display font-bold text-[#1a3a2a]">Competitor Comparison (Indicative)</h3><p class="text-xs text-[#8a9a8a]">Admin manages competitor table — last verified date required. Do not present outdated as live pricing.</p></div>
        <div class="overflow-auto">
          <table class="w-full text-xs">
            <thead class="bg-[#f5f1e8] text-[#6a5a3a]"><tr><th class="text-left p-3">Resort</th><th class="text-left p-3">Location</th><th class="text-left p-3">Rooms</th><th class="text-left p-3">Price</th><th class="text-left p-3">Rating</th><th class="text-left p-3">USP</th></tr></thead>
            <tbody>
              @forelse($competitors as $c)
                <tr class="border-t border-[#f5f1e8]"><td class="p-3 font-medium">{{ $c->name }}</td><td class="p-3">{{ $c->location }}</td><td class="p-3">{{ $c->rooms }}</td><td class="p-3">{{ $c->price_range }}</td><td class="p-3">{{ $c->rating }}</td><td class="p-3 text-[#6a7a6a]">{{ $c->usp }}</td></tr>
              @empty
                @php $comps=[['Sairu Hill','5km', '20–25','12k–25k','4.3','Hilltop luxury'],['Green Peak','8km','30–35','8k–15k','4.1','Pool+highway'],['Boisabi','25km','10–15','6k–12k','4.4','Eco remote'],['Holiday Inn','3km','40–50','7k–14k','4.2','Family brand']]; @endphp
                @foreach($comps as [$n,$l,$r,$p,$rat,$usp])<tr class="border-t"><td class="p-3 font-medium">{{ $n }}</td><td class="p-3">{{ $l }}</td><td class="p-3">{{ $r }}</td><td class="p-3">{{ $p }}</td><td class="p-3">{{ $rat }}</td><td class="p-3">{{ $usp }}</td></tr>@endforeach
              @endforelse
            </tbody>
          </table>
        </div>
      </div>
      <div class="mt-6 bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Seasonality</h3>
        <div class="mt-3 overflow-auto">
          <table class="w-full text-xs">
            <thead class="text-[#8a9a8a] border-b"><tr><th class="text-left py-2">Season</th><th>Occupancy</th><th>Pricing</th><th>Notes</th></tr></thead>
            <tbody>
              <tr class="border-b"><td class="py-2 font-medium">Winter (Nov–Feb)</td><td class="text-center">70–90%</td><td class="text-center">+30–50%</td><td>Peak, book 2–3 months ahead</td></tr>
              <tr class="border-b"><td class="py-2 font-medium">Eid</td><td class="text-center">85–100%</td><td class="text-center">+50–100%</td><td>Sold out weeks ahead</td></tr>
              <tr class="border-b"><td class="py-2 font-medium">Monsoon (Jun–Sep)</td><td class="text-center">20–35%</td><td class="text-center">-20–30%</td><td>Landslide risk, road closures</td></tr>
              <tr><td class="py-2 font-medium">Shoulder</td><td class="text-center">45–60%</td><td class="text-center">Baseline</td><td>Corporate retreats possible</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Target Segments</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li class="flex justify-between"><span>Affluent families</span><span class="text-[#8b6f47]">60%</span></li>
          <li class="flex justify-between"><span>Couples</span><span class="text-[#8b6f47]">25%</span></li>
          <li class="flex justify-between"><span>Corporate retreats</span><span class="text-[#8b6f47]">5%</span></li>
          <li class="flex justify-between"><span>Nature travelers</span><span class="text-[#8b6f47]">—</span></li>
        </ul>
        <p class="mt-3 text-xs text-[#8a9a8a]">High-income 10–15% willing BDT 8k–20k/night.</p>
      </div>
      <div class="bg-[#f5f1e8] border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Key Statistics</h3>
        <div class="mt-3 space-y-3">
          @forelse($stats as $s)<div class="bg-white border border-[#e8e0d0] rounded-lg p-3"><div class="text-xs text-[#8a9a8a]">{{ $s->metric_en }}</div><div class="font-bold text-[#1a3a2a]">{{ $s->value }}</div><div class="text-[11px] text-[#8a9a8a]">Source: {{ $s->source }}</div></div>
          @empty
            <div class="bg-white rounded-lg p-3 border"><div class="text-xs text-[#8a9a8a]">Domestic trips (annual)</div><div class="font-bold">~9M</div><div class="text-[11px]">Parjaton Corp • CC BY</div></div>
            <div class="bg-white rounded-lg p-3 border"><div class="text-xs text-[#8a9a8a]">Stay duration</div><div class="font-bold">2–4 nights (weekend)</div></div>
          @endforelse
        </div>
      </div>
    </div>
  </div>
</div>
@endsection
