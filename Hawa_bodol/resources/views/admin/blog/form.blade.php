@extends('layouts.admin')
@section('title','Blog Post Form')
@section('content')
<a href="{{ route('admin.blog.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Blog Post</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.blog.update', $item->id) : route('admin.blog.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title EN</label><input type="text" name="title_en" value="{{ old("title_en", $item->title_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Title BN</label><input type="text" name="title_bn" value="{{ old("title_bn", $item->title_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Slug</label><input type="text" name="slug" value="{{ old("slug", $item->slug ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Excerpt EN</label><textarea name="excerpt_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("excerpt_en", $item->excerpt_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Content EN</label><textarea name="content_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("content_en", $item->content_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Category</label><input type="text" name="category" value="{{ old("category", $item->category ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Thumbnail</label><input type="file" name="thumbnail" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->thumbnail) Current: {{ $item->thumbnail }} @endif</div></div>
      <div><label class="text-xs font-medium">SEO Title</label><input type="text" name="seo_title" value="{{ old("seo_title", $item->seo_title ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Meta Description</label><textarea name="meta_description" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("meta_description", $item->meta_description ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Author</label><input type="text" name="author" value="{{ old("author", $item->author ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Status</label><select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="draft" @selected(old("status", $item->status ?? "")=="draft")>draft</option><option value="published" @selected(old("status", $item->status ?? "")=="published")>published</option><option value="archived" @selected(old("status", $item->status ?? "")=="archived")>archived</option></select></div>
      <div><label class="text-xs font-medium">Published At</label><input type="date" name="published_at" value="{{ old("published_at", isset($item) && $item->published_at ? $item->published_at->format("Y-m-d") : "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
