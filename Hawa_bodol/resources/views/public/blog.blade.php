@extends('layouts.app')
@section('title','Blog — Project Updates')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Blog</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Project Updates & Insights</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Admin-managed: create, publish, schedule, SEO title/meta, slug, author, thumbnail. Categories: Project, Development, Market, Hospitality, Sustainability, Culture.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    @forelse($posts as $p)
      <a href="{{ route('blog.show',$p->slug) }}" class="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden hover:shadow">
        @if($p->thumbnail)<img src="{{ asset('storage/'.$p->thumbnail) }}" class="h-44 w-full object-cover">@else<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600" class="h-44 w-full object-cover">@endif
        <div class="p-4"><div class="text-[11px] text-[#8b6f47] uppercase tracking-widest">{{ $p->category }} • {{ $p->published_at?->format('M d, Y') }}</div><h3 class="font-medium mt-1 text-[#1a3a2a]">{{ $p->title_en }}</h3><p class="text-xs text-[#6a7a6a] mt-1">{{ $p->excerpt_en }}</p></div>
      </a>
    @empty
      <div class="col-span-3 bg-white border rounded-2xl p-8 text-center text-sm text-[#6a7a6a]">No posts yet — create via admin Blog.</div>
    @endforelse
  </div>
  <div class="mt-6">{{ $posts->links() }}</div>
</div>
@endsection
