@extends('layouts.app')
@section('title','The Opportunity — Why Bandarban, Why Now')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">The Opportunity</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">Why Bandarban — and why now</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Domestic tourism growth, a premium supply gap, and a location that creates defensible differentiation. All statistics include source and subject to verification.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid lg:grid-cols-2 gap-8">
    <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h3 class="font-display font-bold text-[#1a3a2a]">Market Snapshot</h3>
      <p class="text-xs text-[#8a9a8a] mt-1">Reliable public data unavailable for exact Bandarban arrivals — estimates based on industry reports & booking data.</p>
      <div class="mt-4 space-y-3">
        @forelse($stats as $s)
          <div class="flex justify-between items-center border-b border-[#f5f1e8] pb-2">
            <div><div class="text-sm font-medium text-[#1a3a2a]">{{ $s->metric_en }}</div><div class="text-[11px] text-[#8a9a8a]">Source: {{ $s->source }} @if($s->source_url)<a href="{{ $s->source_url }}" class="underline">link</a>@endif</div></div>
            <div class="text-sm font-bold text-[#8b6f47]">{{ $s->value }}</div>
          </div>
        @empty
          @php $fallbackStats=[['Domestic tourist trips (annual)','~9 million','Bangladesh Parjaton Corp'],['Bandarban position','Top 3 hill destination','Industry consensus'],['Peak season occupancy','70–90% (Nov–Feb)','Booking platforms'],['Premium ceiling','BDT 12k–25k/night','Competitor survey'],['High-income travelers','10–15% willing BDT 8k–20k','Industry est.']]; @endphp
          @foreach($fallbackStats as [$m,$v,$src])<div class="flex justify-between py-2 border-b border-[#f5f1e8]"><div><div class="text-sm font-medium">{{ $m }}</div><div class="text-[11px] text-[#8a9a8a]">{{ $src }}</div></div><div class="font-bold text-[#8b6f47] text-sm">{{ $v }}</div></div>@endforeach
        @endforelse
      </div>
    </div>
    <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h3 class="font-display font-bold text-[#1a3a2a]">Competitive Gap</h3>
      <p class="text-sm text-[#6a7a6a] mt-2">Current Bandarban resorts cluster at BDT 2,500–9,000 with basic pools. No property offers 21 bigha low-density + river frontage + curated nature + genuine luxury (infinity pool, private villas).</p>
      <div class="mt-4 overflow-auto">
        <table class="w-full text-xs">
          <thead><tr class="text-left text-[#8a9a8a] border-b"><th class="py-2">Resort</th><th>Range</th><th>USP</th></tr></thead>
          <tbody>
            @forelse($competitors as $c)<tr class="border-b border-[#f5f1e8]"><td class="py-2 font-medium">{{ $c->name }}</td><td>{{ $c->price_range }}</td><td class="text-[#6a7a6a]">{{ $c->usp }}</td></tr>
            @empty
              <tr class="border-b"><td class="py-2">Sairu Hill</td><td>12k–25k</td><td>Hilltop luxury</td></tr>
              <tr class="border-b"><td class="py-2">Green Peak</td><td>8k–15k</td><td>Pool + highway</td></tr>
              <tr class="border-b"><td class="py-2">Labah Tong</td><td>10k–18k</td><td>Valley luxury</td></tr>
              <tr><td class="py-2">Typical mid-market</td><td>3k–8k</td><td>Basic pool/AC</td></tr>
            @endforelse
          </tbody>
        </table>
      </div>
      <a href="/market" class="mt-4 inline-block text-sm bg-[#1a3a2a] text-white px-5 py-2.5 rounded-full">Full Market Analysis →</a>
    </div>
  </div>
  <div class="mt-8 bg-[#1a3a2a] rounded-2xl p-8 text-white">
    <h3 class="font-display text-xl font-bold">Differentiation Opportunity</h3>
    <p class="text-sm text-white/70 mt-2 max-w-2xl">18 cottages at BDT 10k–18k with 45–65% occupancy → BDT 1.8–5.13 Cr room revenue. Low-density + riverfront + mountain views creates a moat mid-market cannot replicate.</p>
    <div class="mt-4 flex gap-3"><a href="/investment" class="bg-[#c9a961] text-[#0f1f14] px-5 py-2.5 rounded-full text-sm font-semibold">View Investment →</a><a href="/financials" class="border border-white/20 px-5 py-2.5 rounded-full text-sm">Financials</a></div>
  </div>
</div>
@endsection
