@extends('layouts.admin')
@section('title','Cottage Form')
@section('content')
<a href="{{ route('admin.cottages.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Cottage</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.cottages.update', $item->id) : route('admin.cottages.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Name EN</label><input type="text" name="name_en" value="{{ old("name_en", $item->name_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Name BN</label><input type="text" name="name_bn" value="{{ old("name_bn", $item->name_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Type</label><input type="text" name="type" value="{{ old("type", $item->type ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Count</label><input type="number" step="any" name="count" value="{{ old("count", $item->count ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Size</label><input type="text" name="size" value="{{ old("size", $item->size ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Price Range</label><input type="text" name="price_range" value="{{ old("price_range", $item->price_range ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Description EN</label><textarea name="description_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("description_en", $item->description_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Image</label><input type="file" name="image" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->image) Current: {{ $item->image }} @endif</div></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
