@extends('layouts.app')
@section('title','Investment Risk Disclaimer — Hawa Bodol')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Legal</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Investment Risk Disclaimer</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Prominently accessible from every investment CTA.</p>
  </div>
</section>

<div class="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 lg:p-8">
    <p class="text-sm leading-relaxed text-amber-900">This website presents information about a proposed hospitality development opportunity. Any financial projections are indicative and subject to change. Nothing on this website constitutes a guarantee of return, a public offer, investment advice, or a binding commitment. Prospective investors should conduct independent legal, financial, tax and technical due diligence before making any investment decision.</p>
    <p class="text-xs text-amber-800 mt-3">Editable via admin — SiteSetting key: disclaimer_en / disclaimer_bn.</p>
  </div>
</div>
@endsection
