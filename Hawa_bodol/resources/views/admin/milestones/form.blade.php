@extends('layouts.admin')
@section('title','Milestone Form')
@section('content')
<a href="{{ route('admin.milestones.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Milestone</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.milestones.update', $item->id) : route('admin.milestones.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title EN</label><input type="text" name="title_en" value="{{ old("title_en", $item->title_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Title BN</label><input type="text" name="title_bn" value="{{ old("title_bn", $item->title_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Description EN</label><textarea name="description_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("description_en", $item->description_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Phase</label><input type="text" name="phase" value="{{ old("phase", $item->phase ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Start</label><input type="date" name="start_date" value="{{ old("start_date", isset($item) && $item->start_date ? $item->start_date->format("Y-m-d") : "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">End</label><input type="date" name="end_date" value="{{ old("end_date", isset($item) && $item->end_date ? $item->end_date->format("Y-m-d") : "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Status</label><select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="pending" @selected(old("status", $item->status ?? "")=="pending")>pending</option><option value="in_progress" @selected(old("status", $item->status ?? "")=="in_progress")>in_progress</option><option value="completed" @selected(old("status", $item->status ?? "")=="completed")>completed</option><option value="delayed" @selected(old("status", $item->status ?? "")=="delayed")>delayed</option></select></div>
      <div><label class="text-xs font-medium">Image</label><input type="file" name="image" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->image) Current: {{ $item->image }} @endif</div></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
