@extends('layouts.admin')
@section('title','Competitor Form')
@section('content')
<a href="{{ route('admin.competitors.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Competitor</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.competitors.update', $item->id) : route('admin.competitors.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Name</label><input type="text" name="name" value="{{ old("name", $item->name ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Location</label><input type="text" name="location" value="{{ old("location", $item->location ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Rooms</label><input type="text" name="rooms" value="{{ old("rooms", $item->rooms ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Price Range</label><input type="text" name="price_range" value="{{ old("price_range", $item->price_range ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Facilities</label><input type="text" name="facilities" value="{{ old("facilities", $item->facilities ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Target</label><input type="text" name="target_customer" value="{{ old("target_customer", $item->target_customer ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Rating</label><input type="text" name="rating" value="{{ old("rating", $item->rating ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Strengths</label><textarea name="strengths" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("strengths", $item->strengths ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Weaknesses</label><textarea name="weaknesses" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("weaknesses", $item->weaknesses ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">USP</label><input type="text" name="usp" value="{{ old("usp", $item->usp ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Source</label><input type="text" name="source" value="{{ old("source", $item->source ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
