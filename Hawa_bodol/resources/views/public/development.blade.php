@extends('layouts.app')
@section('title','Development Plan — Phased Timeline')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Development Plan</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">From approvals to opening — phased & scalable</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Admin can create, edit, reorder milestones, change dates/status, upload images. Timeline is indicative and subject to approvals.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="relative border-l-2 border-[#e8e0d0] ml-4 lg:ml-8 space-y-8">
    @forelse($milestones as $m)
      <div class="relative pl-8">
        <div class="absolute -left-[9px] top-2 w-4 h-4 rounded-full {{ $m->status=='completed' ? 'bg-emerald-600' : ($m->status=='in_progress' ? 'bg-[#c9a961] animate-pulse' : 'bg-[#e8e0d0] border-2 border-[#c9a961]') }}"></div>
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5 flex gap-4">
          @if($m->image)<img src="{{ asset('storage/'.$m->image) }}" class="w-24 h-24 rounded-lg object-cover hidden sm:block">@endif
          <div>
            <div class="text-xs tracking-widest uppercase text-[#8b6f47]">{{ $m->phase }} • {{ $m->status }}</div>
            <h3 class="font-medium text-[#1a3a2a]">{{ $m->title_en }}</h3>
            <p class="text-xs text-[#6a7a6a] mt-1">{{ $m->description_en }}</p>
            <div class="text-[11px] text-[#8a9a8a] mt-2">{{ $m->start_date?->format('M Y') }} @if($m->end_date) — {{ $m->end_date->format('M Y') }} @endif</div>
          </div>
        </div>
      </div>
    @empty
      @php $fallback=[['Phase 1','Legal + Design + Approvals','Status: pending','Verify land docs, engage lawyer, architect, DoE/Hill District'],['Phase 2','Infrastructure + Construction','Status: pending','Road, utilities, foundations, drainage'],['Phase 3','Cottages + Restaurant + Pool','Status: pending','18 cottages, 50–70 seat restaurant, infinity pool'],['Phase 4','Landscape + Experiences','Status: pending','Gardens, trails, river dock, cultural zones'],['Phase 5','Soft Launch','Status: pending','Staff training, trial stays'],['Phase 6','Full Operation','Status: pending','Opening, marketing, quarterly reporting']]; @endphp
      @foreach($fallback as [$ph,$t,$s,$d])
        <div class="relative pl-8"><div class="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-[#e8e0d0] border-2 border-[#c9a961]"></div><div class="bg-white border border-[#e8e0d0] rounded-2xl p-5"><div class="text-xs uppercase text-[#8b6f47]">{{ $ph }} • {{ $s }}</div><h3 class="font-medium mt-1">{{ $t }}</h3><p class="text-xs text-[#6a7a6a]">{{ $d }}</p></div></div>
      @endforeach
    @endforelse
  </div>
  <div class="mt-8 text-center"><a href="/investor-inquiry" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm">Schedule a Site Visit →</a></div>
</div>
@endsection
