@extends('layouts.app')
@section('title','Investor Opportunity — SPV, Returns, Reporting')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Investor Opportunity</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">An Opportunity to Build Something Exceptional</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">What is being built, where, why the location matters, funding, structure, risks, and reporting. Primary CTA: Request Deck → Site Visit → Due Diligence.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-display font-bold text-lg">Why This Location</h3>
        <p class="text-sm text-[#6a7a6a] mt-2">21 bigha riverfront + mountain views + road access + low-density plan = defensible premium positioning mid-market cannot replicate. Ruposhi Para/Lama is on Chittagong–Bandarban highway, 30km from Bandarban town — not a primary destination itself, so the resort must create its own pull through premium facilities.</p>
        <div class="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
          <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="font-bold">21 Bigha</div><div class="text-[#6a7a6a]">Low-density, conservation, future +10 cottages</div></div>
          <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="font-bold">Matamuhuri</div><div class="text-[#6a7a6a]">River dock, kayaking, riverside dining</div></div>
          <div class="bg-[#f5f1e8] rounded-xl p-3"><div class="font-bold">Market Gap</div><div class="text-[#6a7a6a]">No competitor offers this combination</div></div>
        </div>
      </div>
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-display font-bold">Investor Reporting</h3>
        <ul class="mt-3 space-y-2 text-sm text-[#4a5a4a]">
          <li>• Quarterly project update & financial reporting</li>
          <li>• Development progress vs budget & milestones</li>
          <li>• Material risks & mitigations</li>
          <li>• Annual investor meeting where applicable</li>
        </ul>
        <p class="text-[11px] text-[#8a9a8a] mt-3">Do not claim audited reports exist unless they do.</p>
      </div>
    </div>
    <div class="space-y-6">
      <div class="bg-[#1a3a2a] rounded-2xl p-6 text-white">
        <h3 class="font-bold">Request Investor Deck</h3>
        <form method="POST" action="{{ route('deck.request') }}" class="mt-4 space-y-3">
          @csrf
          <input name="name" required placeholder="Full Name" class="w-full rounded-lg px-3 py-2.5 text-sm text-[#1a3a2a]">
          <input name="email" type="email" required placeholder="Email" class="w-full rounded-lg px-3 py-2.5 text-sm text-[#1a3a2a]">
          <input name="phone" required placeholder="Phone" class="w-full rounded-lg px-3 py-2.5 text-sm text-[#1a3a2a]">
          <button class="w-full bg-[#c9a961] text-[#0f1f14] py-2.5 rounded-full text-sm font-semibold">Request Deck →</button>
        </form>
        <p class="text-[11px] text-white/60 mt-3 text-center">Submitting does not constitute offer/acceptance.</p>
      </div>
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Trust Signals</h3>
        <ul class="mt-3 space-y-1.5 text-xs text-[#6a7a6a]">
          <li>✓ Land docs — lawyer-verified (qualified investors)</li>
          <li>✓ Regulatory checklist — Hill District, DoE, tourism</li>
          <li>✓ Conservative modeling — 45–55% occupancy</li>
          <li>✓ SPV structure — transparent governance</li>
          <li>✓ Risk disclosure — not hidden</li>
        </ul>
      </div>
    </div>
  </div>
</div>
@endsection
