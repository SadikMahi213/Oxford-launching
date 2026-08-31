@extends('layouts.app')
@section('title','Financial Model — Revenue, EBITDA, ROI')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Financials</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">Financial Model — Indicative</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Conservative / Base / Optimistic scenarios. All numbers editable from admin. Projected — not guaranteed. Subject to final financial model.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div x-data="{tab:'base'}">
    <div class="flex gap-2 justify-center">
      @php $tabs=['conservative'=>'Conservative','base'=>'Base Case','optimistic'=>'Optimistic']; @endphp
      @foreach($tabs as $k=>$v)
        <button @click="tab='{{ $k }}'" :class="tab==='{{ $k }}' ? 'bg-[#1a3a2a] text-white' : 'bg-white border border-[#e8e0d0] text-[#4a5a4a]'" class="px-5 py-2.5 rounded-full text-sm font-medium">{{ $v }}</button>
      @endforeach
    </div>
    <div class="mt-8 grid lg:grid-cols-3 gap-4">
      @forelse($scenarios as $s)
        <div x-show="tab==='{{ $s->name }}'" class="lg:col-span-3 grid lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 bg-white border border-[#e8e0d0] rounded-2xl p-6">
            <h3 class="font-display font-bold text-[#1a3a2a]">{{ $s->label_en }} — BDT {{ number_format($s->adr) }} ADR • {{ $s->occupancy }}% occ • {{ $s->rooms }} rooms</h3>
            <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="text-[#6a7a6a]">Room Revenue</div><div class="font-bold">BDT {{ number_format($s->room_revenue/10000000,2) }} Cr</div></div>
              <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="text-[#6a7a6a]">Restaurant</div><div class="font-bold">BDT {{ number_format($s->restaurant_revenue/10000000,2) }} Cr</div></div>
              <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="text-[#6a7a6a]">Activities</div><div class="font-bold">BDT {{ number_format($s->activity_revenue/10000000,2) }} Cr</div></div>
              <div class="bg-[#1a3a2a] text-white rounded-xl p-3"><div class="text-white/70">Total Revenue</div><div class="font-bold text-[#c9a961]">BDT {{ number_format($s->total_revenue/10000000,2) }} Cr</div></div>
            </div>
            <div class="mt-4">
              <canvas id="chart-{{ $s->name }}" class="w-full h-[220px]"></canvas>
              <div class="mt-3 h-3 bg-[#f5f1e8] rounded-full flex overflow-hidden text-[10px] leading-[12px] text-white text-center">
                <div class="bg-[#1a3a2a]" style="width:60%">Rooms</div><div class="bg-[#c9a961] text-[#0f1f14]" style="width:25%">Restaurant</div><div class="bg-[#8b6f47]" style="width:15%">Activities</div>
              </div>
              <p class="text-[11px] text-[#8a9a8a] mt-2">Operating expenses {{ $s->opex_percent }}% — includes staff 25%, utilities 15%, maintenance 10%, marketing 5%, admin 5%. Tax 25%.</p>
            </div>
          </div>
          <div class="space-y-4">
            <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
              <div class="text-xs tracking-widest uppercase text-[#8b6f47]">Profitability</div>
              <div class="mt-3 space-y-3">
                <div class="flex justify-between"><span class="text-sm text-[#6a7a6a]">EBITDA</span><span class="font-bold">BDT {{ number_format($s->ebitda/10000000,2) }} Cr</span></div>
                <div class="flex justify-between"><span class="text-sm text-[#6a7a6a]">Net Profit (after tax)</span><span class="font-bold text-[#1a3a2a]">BDT {{ number_format($s->net_profit/10000000,2) }} Cr</span></div>
                <div class="flex justify-between"><span class="text-sm text-[#6a7a6a]">ROI</span><span class="font-bold text-[#c9a961]">{{ $s->roi }}%</span></div>
                <div class="flex justify-between"><span class="text-sm text-[#6a7a6a]">Payback</span><span class="font-bold">{{ $s->payback_years }} yrs</span></div>
                <div class="flex justify-between"><span class="text-sm text-[#6a7a6a]">Break-even occ.</span><span class="font-bold">{{ $s->break_even_occupancy }}%</span></div>
              </div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4"><p class="text-xs text-amber-900 leading-relaxed">Projected figures only. Actual results depend on occupancy, ADR, costs, seasonality, and approvals. Independent verification required.</p></div>
          </div>
        </div>
      @empty
        <div class="lg:col-span-3 bg-white border rounded-2xl p-8 text-center text-sm text-[#6a7a6a]">No scenarios yet — seed data will populate. Base: 55% occ, BDT 10k ADR, BDT 4.51Cr revenue, 51% ROI, 4.0yr payback.</div>
      @endforelse
    </div>
  </div>
  <div class="mt-8 text-center"><a href="/investor-inquiry" class="bg-[#1a3a2a] text-white px-7 py-3 rounded-full text-sm">Request Detailed Financial Model →</a></div>
</div>
@endsection
