@extends('layouts.admin')
@section('title','Experience Form')
@section('content')
<a href="{{ route('admin.experiences.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Experience</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.experiences.update', $item->id) : route('admin.experiences.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title EN</label><input type="text" name="title_en" value="{{ old("title_en", $item->title_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Title BN</label><input type="text" name="title_bn" value="{{ old("title_bn", $item->title_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Description EN</label><textarea name="description_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("description_en", $item->description_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Image</label><input type="file" name="image" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->image) Current: {{ $item->image }} @endif</div></div>
      <div><label class="text-xs font-medium">Category</label><input type="text" name="category" value="{{ old("category", $item->category ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
