@extends('layouts.app')
@section('title','Team — Founders, Advisors, Partners')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Team & Trust</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">People behind Hawa Bodol</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">No fake team members — if a role is not finalized, we show “Advisor to be appointed.” All profiles editable via admin.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @forelse($all as $m)
    @if($loop->first)<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">@endif
  @empty
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      @php $fallback=[['Founder','Project leadership, vision','To be finalized'],['Project Management','Operations, timeline','Advisor to be appointed'],['Architect','Masterplan, 3D renders','Advisor to be appointed'],['Legal Advisor','Hill District land law','Advisor to be appointed'],['Financial Advisor','Model, SPV, reporting','Advisor to be appointed'],['Construction Partner','Fixed-price, BNBC 2020','To be appointed'],['Hospitality Operator','Guest experience','To be appointed']]; @endphp
      @foreach($fallback as [$name,$pos,$bio])
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5 text-center">
          <div class="w-20 h-20 rounded-full bg-[#f5f1e8] border border-[#e8e0d0] mx-auto flex items-center justify-center text-[#8b6f47] text-xl">◎</div>
          <h3 class="font-medium mt-3 text-[#1a3a2a]">{{ $name }}</h3>
          <div class="text-xs text-[#8b6f47]">{{ $pos }}</div>
          <p class="text-xs text-[#6a7a6a] mt-2">{{ $bio }}</p>
        </div>
      @endforeach
    </div>
  @endforelse
  @if($all->count())
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      @foreach($all as $m)
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5 text-center">
          @if($m->photo)<img src="{{ asset('storage/'.$m->photo) }}" class="w-20 h-20 rounded-full mx-auto object-cover">@else<div class="w-20 h-20 rounded-full bg-[#f5f1e8] border mx-auto flex items-center justify-center">◎</div>@endif
          <h3 class="font-medium mt-3">{{ $m->name }}</h3>
          <div class="text-xs text-[#8b6f47]">{{ $m->position_en }}</div>
          <p class="text-xs text-[#6a7a6a] mt-2">{{ $m->bio_en }}</p>
          @if($m->linkedin)<a href="{{ $m->linkedin }}" class="text-xs text-[#1a3a2a] underline">LinkedIn</a>@endif
        </div>
      @endforeach
    </div>
  @endif
  <div class="mt-8 bg-[#f5f1e8] border border-[#e8e0d0] rounded-2xl p-6">
    <h3 class="font-medium text-[#1a3a2a]">Trust Signals</h3>
    <ul class="mt-3 grid sm:grid-cols-2 gap-2 text-xs text-[#6a7a6a]">
      <li>✓ Property documentation status</li><li>✓ Legal advisor status</li><li>✓ Company registration status</li><li>✓ Architect & contractor info</li><li>✓ Financial assumptions disclosed</li><li>✓ Physical location & contact</li>
    </ul>
  </div>
</div>
@endsection
