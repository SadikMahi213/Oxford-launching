@extends('layouts.app')
@section('title', $post->seo_title ?? $post->title_en)
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-widest uppercase text-[#c9a961]">{{ $post->category }} • {{ $post->published_at?->format('M d, Y') }}</div>
    <h1 class="font-display text-[30px] font-bold mt-2 leading-tight">{{ $post->title_en }}</h1>
    <p class="text-sm text-white/70 mt-3">{{ $post->excerpt_en }}</p>
  </div>
</section>
<div class="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @if($post->thumbnail)<img src="{{ asset('storage/'.$post->thumbnail) }}" class="w-full h-[380px] object-cover rounded-2xl border border-[#e8e0d0]">@endif
  <article class="prose prose-sm max-w-none mt-6 bg-white border border-[#e8e0d0] rounded-2xl p-6 lg:p-8 text-[#4a5a4a] leading-relaxed">
    {!! nl2br(e($post->content_en)) !!}
  </article>
  <div class="mt-6"><a href="{{ route('blog') }}" class="text-sm border px-5 py-2.5 rounded-full bg-white">← Back to updates</a></div>
</div>
@endsection
