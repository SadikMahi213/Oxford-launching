@extends('layouts.admin')
@section('title','Team Member Form')
@section('content')
<a href="{{ route('admin.team.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Team Member</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.team.update', $item->id) : route('admin.team.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Name</label><input type="text" name="name" value="{{ old("name", $item->name ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Position EN</label><input type="text" name="position_en" value="{{ old("position_en", $item->position_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Position BN</label><input type="text" name="position_bn" value="{{ old("position_bn", $item->position_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Bio EN</label><textarea name="bio_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("bio_en", $item->bio_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Category</label><select name="category" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="founder" @selected(old("category", $item->category ?? "")=="founder")>founder</option><option value="management" @selected(old("category", $item->category ?? "")=="management")>management</option><option value="architect" @selected(old("category", $item->category ?? "")=="architect")>architect</option><option value="legal" @selected(old("category", $item->category ?? "")=="legal")>legal</option><option value="financial" @selected(old("category", $item->category ?? "")=="financial")>financial</option><option value="advisor" @selected(old("category", $item->category ?? "")=="advisor")>advisor</option><option value="construction" @selected(old("category", $item->category ?? "")=="construction")>construction</option><option value="hospitality" @selected(old("category", $item->category ?? "")=="hospitality")>hospitality</option></select></div>
      <div><label class="text-xs font-medium">Photo</label><input type="file" name="photo" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->photo) Current: {{ $item->photo }} @endif</div></div>
      <div><label class="text-xs font-medium">LinkedIn</label><input type="text" name="linkedin" value="{{ old("linkedin", $item->linkedin ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Website</label><input type="text" name="website" value="{{ old("website", $item->website ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
