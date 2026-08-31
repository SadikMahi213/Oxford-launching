@extends('layouts.app')
@section('title','The Resort — Cottages, Dining, Experiences')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">The Resort</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2 leading-tight">A future premium destination</h1>
    <p class="text-sm lg:text-[15px] text-white/70 mt-3 max-w-2xl">Private cottages, riverside dining, infinity pool, nature trails and Bengal heritage experiences — thoughtfully planned, conservation-minded.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <h2 class="font-display text-2xl font-bold text-[#1a3a2a]">Cottages</h2>
  <p class="text-sm text-[#6a7a6a] mt-1">Private, peaceful accommodation with nature views and Bengali-inspired design. Indicative — subject to approvals.</p>
  <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
    @forelse($cottages as $c)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
        <img src="{{ $c->image ?? 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600' }}" class="h-44 w-full object-cover">
        <div class="p-4"><h3 class="font-medium text-sm text-[#1a3a2a]">{{ $c->name_en }}</h3><div class="text-xs text-[#8b6f47]">{{ $c->type }} • {{ $c->size }} • {{ $c->price_range }}</div><p class="text-xs text-[#6a7a6a] mt-2">{{ $c->description_en }}</p></div>
      </div>
    @empty
      @php $fallback=[['River-View Villa','1BR','500–600 sq ft','12k–15k'],['Mountain Cottage','1BR','450–550 sq ft','10k–13k'],['Family Suite','2BR','800–1000 sq ft','15k–20k'],['Premium Suite','1BR+Living','700–800 sq ft','18k–25k']]; @endphp
      @foreach($fallback as [$n,$t,$s,$p])<div class="bg-white border border-[#e8e0d0] rounded-2xl p-4"><div class="h-32 rounded-xl bg-[#f5f1e8] border border-[#e8e0d0] flex items-center justify-center text-xs text-[#8b6f47]">Concept visualization</div><h3 class="font-medium mt-3 text-sm">{{ $n }}</h3><div class="text-xs text-[#8b6f47]">{{ $t }} • {{ $s }} • BDT {{ $p }}/night</div><p class="text-xs text-[#6a7a6a] mt-1">Private outdoor area, nature views, Bengali-inspired interiors. Subject to verification.</p></div>@endforeach
    @endforelse
  </div>

  <h2 class="font-display text-2xl font-bold text-[#1a3a2a] mt-12">Facilities</h2>
  <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    @forelse($facilities as $f)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
        <img src="{{ $f->image ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' }}" class="h-40 w-full object-cover">
        <div class="p-4"><h3 class="font-medium text-sm">{{ $f->title_en }}</h3><p class="text-xs text-[#6a7a6a] mt-1">{{ $f->description_en }}</p><span class="mt-2 inline-block text-[11px] bg-[#f5f1e8] border border-[#e8e0d0] px-2 py-1 rounded-full">{{ $f->category ?? 'Facility' }}</span></div>
      </div>
    @empty
      @php $facs=[['Riverside Dining','50–70 seats • Bengali cuisine, local ingredients, river/mountain views'],['Infinity Pool','Panoramic valley view — where technically feasible'],['River Dock & Kayak','Matamuhuri canoe/kayak, riverside dining'],['Viewing Deck','Observation tower, sunrise/sunset, photography'],['Event/Retreat Area','50–100 people • corporate retreats'],['Sustainability','Waste treatment, native gardens, hill-cut minimized']]; @endphp
      @foreach($facs as [$t,$d])<div class="bg-white border border-[#e8e0d0] rounded-2xl p-4"><h3 class="font-medium text-sm">{{ $t }}</h3><p class="text-xs text-[#6a7a6a] mt-1">{{ $d }}</p></div>@endforeach
    @endforelse
  </div>

  <h2 class="font-display text-2xl font-bold text-[#1a3a2a] mt-12">Nature & Heritage Experiences</h2>
  <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
    @forelse($experiences as $e)
      <div class="bg-white border border-[#e8e0d0] rounded-xl p-4"><h3 class="font-medium text-sm">{{ $e->title_en }}</h3><p class="text-xs text-[#6a7a6a] mt-1">{{ $e->description_en }}</p></div>
    @empty
      @php $exps=['River experiences','Guided nature walks','Sunrise/sunset points','Photography','Traditional food','Folk craftsmanship','Courtyard slow-living','Birdwatching']; @endphp
      @foreach($exps as $ex)<div class="bg-white border border-[#e8e0d0] rounded-xl p-4"><h3 class="font-medium text-sm">{{ $ex }}</h3><p class="text-xs text-[#6a7a6a] mt-1">Curated, low-impact, respectful of nature and communities.</p></div>@endforeach
    @endforelse
  </div>
  <div class="mt-8 bg-[#f5f1e8] border border-[#e8e0d0] rounded-2xl p-6 flex gap-4 items-start">
    <div class="w-10 h-10 rounded bg-[#1a3a2a] text-[#c9a961] flex items-center justify-center">♡</div>
    <div><h3 class="font-medium text-[#1a3a2a]">Bengali Heritage — Authentic, not artificial</h3><p class="text-xs text-[#6a7a6a] mt-1 leading-relaxed">Courtyard design, handcrafted furniture, folk motifs, and slow-living — without fabricating historical claims. Indigenous collaborations only with consent and fair compensation.</p></div>
  </div>
</div>
@endsection
