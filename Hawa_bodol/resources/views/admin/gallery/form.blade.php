@extends('layouts.admin')
@section('title','Gallery Item Form')
@section('content')
<a href="{{ route('admin.gallery.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Gallery Item</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.gallery.update', $item->id) : route('admin.gallery.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title</label><input type="text" name="title" value="{{ old("title", $item->title ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Category</label><select name="category" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="site" @selected(old("category", $item->category ?? "")=="site")>site</option><option value="concept" @selected(old("category", $item->category ?? "")=="concept")>concept</option><option value="masterplan" @selected(old("category", $item->category ?? "")=="masterplan")>masterplan</option><option value="nature" @selected(old("category", $item->category ?? "")=="nature")>nature</option><option value="culture" @selected(old("category", $item->category ?? "")=="culture")>culture</option><option value="design" @selected(old("category", $item->category ?? "")=="design")>design</option><option value="construction" @selected(old("category", $item->category ?? "")=="construction")>construction</option><option value="video" @selected(old("category", $item->category ?? "")=="video")>video</option></select></div>
      <div><label class="text-xs font-medium">Image</label><input type="file" name="image" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->image) Current: {{ $item->image }} @endif</div></div>
      <div><label class="text-xs font-medium">Video URL</label><input type="text" name="video_url" value="{{ old("video_url", $item->video_url ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Caption</label><textarea name="caption" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("caption", $item->caption ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Source Type</label><select name="source_type" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="actual" @selected(old("source_type", $item->source_type ?? "")=="actual")>actual</option><option value="concept" @selected(old("source_type", $item->source_type ?? "")=="concept")>concept</option><option value="reference" @selected(old("source_type", $item->source_type ?? "")=="reference")>reference</option></select></div>
      <div><label class="text-xs font-medium">Source URL</label><input type="text" name="source_url" value="{{ old("source_url", $item->source_url ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
