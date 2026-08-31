@extends('layouts.app')
@section('title','Request Investor Deck — Hawa Bodol')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Investor Deck</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Request the Investor Deck</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">A gated download — lead stored, admin notified, deck PDF replaceable via admin without developer.</p>
  </div>
</section>

<div class="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @if(session('success'))<div class="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-sm mb-6">{{ session('success') }}</div>@endif
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
    <h3 class="font-display font-bold text-[#1a3a2a]">Get the deck (12–15 slides)</h3>
    <p class="text-xs text-[#6a7a6a] mt-1">Cover, opportunity, market, location, property, resort concept, market gap, advantage, development, financials, funding, structure, risks, team, CTA.</p>
    <form method="POST" action="{{ route('deck.request') }}" class="mt-6 space-y-4">
      @csrf
      <div class="grid sm:grid-cols-2 gap-4">
        <input name="name" required placeholder="Full Name *" class="border rounded-lg px-3 py-2.5 text-sm">
        <input name="company" placeholder="Company" class="border rounded-lg px-3 py-2.5 text-sm">
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <input name="email" type="email" required placeholder="Email *" class="border rounded-lg px-3 py-2.5 text-sm">
        <input name="phone" required placeholder="Phone *" class="border rounded-lg px-3 py-2.5 text-sm">
      </div>
      <select name="investment_range" class="w-full border rounded-lg px-3 py-2.5 text-sm bg-white">
        <option value="">Investment Range</option><option>Below BDT 10 lakh</option><option>BDT 10–25 lakh</option><option>BDT 25–50 lakh</option><option>BDT 50 lakh–1 crore</option><option>BDT 1 crore+</option>
      </select>
      <textarea name="message" rows="3" placeholder="Message (optional)" class="w-full border rounded-lg px-3 py-2.5 text-sm"></textarea>
      <button class="w-full bg-[#c9a961] text-[#0f1f14] py-3 rounded-full font-semibold">Request Deck →</button>
      <p class="text-[11px] text-center text-[#8a9a8a]">Download timestamp recorded. Admin controls gated access.</p>
    </form>
  </div>
  <div class="mt-6 bg-[#f5f1e8] border border-[#e8e0d0] rounded-2xl p-6">
    <h4 class="font-medium text-sm">What happens next?</h4>
    <ol class="mt-2 space-y-1 text-xs text-[#6a7a6a] list-decimal list-inside">
      <li>Lead stored + admin notified</li><li>Qualification</li><li>Secure deck delivery / download</li><li>Site visit & diligence → discussion</li>
    </ol>
  </div>
</div>
@endsection
