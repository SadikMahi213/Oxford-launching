@extends('layouts.app')
@section('title','Investment — BDT 3 Crore Use of Funds')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Investment</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">BDT 3 Crore Development Opportunity</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Target capital for phased development. Percentages and amounts editable from admin — never hardcoded unless verified. Investment terms subject to final legal documentation.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2">
      <h2 class="font-display font-bold text-lg text-[#1a3a2a]">Use of Funds</h2>
      <p class="text-xs text-[#8a9a8a] mt-1">Example structure — admin can change total, allocation, percentage, description, status.</p>
      <div class="mt-4 grid sm:grid-cols-2 gap-4">
        @forelse($allocations as $a)
          <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
            <div class="w-10 h-10 rounded bg-[#f5f1e8] flex items-center justify-center text-[#8b6f47] text-sm">{{ $a->icon ?? '◆' }}</div>
            <h3 class="font-medium mt-3 text-[#1a3a2a]">{{ $a->title_en }}</h3>
            <p class="text-xs text-[#6a7a6a] mt-1">{{ $a->description_en }}</p>
            <div class="mt-3 flex items-baseline gap-2"><span class="text-2xl font-bold text-[#1a3a2a]">{{ $a->percentage }}%</span><span class="text-xs bg-[#f5f1e8] border px-2 py-1 rounded-full">BDT {{ number_format($a->amount) }}</span></div>
            <div class="mt-2 h-2 bg-[#f5f1e8] rounded-full overflow-hidden"><div class="h-full bg-[#c9a961]" style="width:{{ $a->percentage }}%"></div></div>
          </div>
        @empty
          @php $fallback=[['Construction','60','18000000','Cottages, structure, civil'],['Facilities','20','6000000','Restaurant, pool, deck, trails'],['Landscaping','7','2100000','Gardens, trails, riverfront'],['Utilities','5','1500000','Power, water, waste'],['Professional','4','1200000','Legal, architect, approvals'],['Working Capital','4','1200000','Pre-opening, 6 months'],['Contingency','10','3000000','Cost overruns']]; @endphp
          @foreach($fallback as [$t,$p,$amt,$d])<div class="bg-white border border-[#e8e0d0] rounded-2xl p-5"><h3 class="font-medium text-sm">{{ $t }}</h3><p class="text-xs text-[#6a7a6a]">{{ $d }}</p><div class="mt-3 flex gap-2 items-baseline"><span class="text-2xl font-bold">{{ $p }}%</span><span class="text-xs border px-2 py-1 rounded-full">BDT {{ number_format($amt) }}</span></div><div class="mt-2 h-2 bg-[#f5f1e8] rounded-full"><div class="h-full bg-[#c9a961]" style="width:{{ $p }}%"></div></div></div>@endforeach
        @endforelse
      </div>
    </div>
    <div class="space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-display font-bold text-[#1a3a2a]">Investment Structure</h3>
        <p class="text-xs text-[#8a9a8a] mt-1">SPV / Project Company — subject to final legal structuring.</p>
        <div class="mt-4 space-y-3">
          @forelse($terms as $t)
            <div class="border border-[#e8e0d0] rounded-xl p-3 bg-[#fdfcf8]"><div class="font-medium text-sm">{{ $t->title_en }}</div><div class="text-xs text-[#c9a961] font-semibold">{{ $t->value }}</div><div class="text-xs text-[#6a7a6a]">{{ $t->description_en }}</div></div>
          @empty
            <div class="border rounded-xl p-3 bg-[#fdfcf8]"><div class="font-medium text-sm">Project Company / SPV</div><div class="text-xs text-[#6a7a6a]">Investors participate through dedicated project company. Ring-fenced liability, clear governance.</div></div>
            <div class="border rounded-xl p-3"><div class="font-medium text-sm">Minimum Investment</div><div class="text-xs text-[#c9a961] font-bold">BDT 10 lakh</div><div class="text-xs text-[#6a7a6a]">Editable via admin.</div></div>
            <div class="border rounded-xl p-3"><div class="font-medium text-sm">Profit Sharing</div><div class="text-xs text-[#6a7a6a]">Dividend policy quarterly/annual — subject to audited accounts.</div></div>
            <div class="border rounded-xl p-3"><div class="font-medium text-sm">Exit</div><div class="text-xs text-[#6a7a6a]">Share buyback, acquisition — detailed in shareholder agreement.</div></div>
          @endforelse
        </div>
        <div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-medium text-amber-900">Disclaimer</div><div class="text-[11px] text-amber-800 leading-relaxed">Investment terms are subject to final legal documentation and independent professional advice. Nothing here is a guarantee or public offer.</div>
        </div>
      </div>
      <div class="bg-[#1a3a2a] rounded-2xl p-6 text-white">
        <h3 class="font-bold">Next Steps</h3>
        <ul class="mt-3 space-y-2 text-sm text-white/80">
          <li>→ Request Investor Deck</li><li>→ Schedule Site Visit</li><li>→ Request Due Diligence Pack</li>
        </ul>
        <a href="/investor-inquiry" class="mt-4 block text-center bg-[#c9a961] text-[#0f1f14] py-2.5 rounded-full text-sm font-semibold">Become an Investor →</a>
      </div>
    </div>
  </div>
</div>
@endsection
