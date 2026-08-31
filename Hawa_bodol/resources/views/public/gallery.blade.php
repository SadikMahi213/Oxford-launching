@extends('layouts.app')
@section('title','Gallery — Site, Concept, Nature')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Gallery</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Site Photography & Concept Visualizations</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Every image labelled: Actual Site Photo / Concept Visualization / Reference Image. Never represent stock as actual resort. Source & copyright shown.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="flex gap-2 flex-wrap">
    @php $cats=['all'=>'All','site'=>'Site','concept'=>'Concept','nature'=>'Nature','culture'=>'Culture','masterplan'=>'Masterplan','construction'=>'Construction']; @endphp
    @foreach($cats as $k=>$v)<button class="px-4 py-2 rounded-full text-xs border {{ $k=='all'?'bg-[#1a3a2a] text-white':'bg-white border-[#e8e0d0]' }}">{{ $v }}</button>@endforeach
  </div>
  <div class="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
    @forelse($all as $g)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
        <img src="{{ $g->image ? asset('storage/'.$g->image) : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600' }}" class="h-56 w-full object-cover">
        <div class="p-3"><div class="font-medium text-sm">{{ $g->title }}</div><div class="text-[11px] text-[#8a9a8a]">{{ ucfirst($g->source_type) }} • {{ $g->category }} @if($g->source_url) • <a href="{{ $g->source_url }}" class="underline">source</a>@endif</div><div class="text-xs text-[#6a7a6a] mt-1">{{ $g->caption }}</div></div>
      </div>
    @empty
      @for($i=0;$i<6;$i++)
        <div class="bg-white border rounded-2xl overflow-hidden"><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80" class="h-56 w-full object-cover"><div class="p-3"><div class="font-medium text-sm">Bandarban Landscape — Reference</div><div class="text-[11px] text-[#8a9a8a]">Reference • Unsplash • CC0</div></div></div>
      @endfor
    @endforelse
  </div>
  <p class="text-xs text-[#8a9a8a] mt-4 text-center">Images from Unsplash/Pexels/Wikimedia Commons (CC0/CC BY-SA) or actual site photos via admin. Concept visualizations labelled.</p>
</div>
@endsection
