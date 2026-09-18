@extends('layouts.admin')
@section('title','Document Form')
@section('content')
<a href="{{ route('admin.documents.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Document</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.documents.update', $item->id) : route('admin.documents.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title</label><input type="text" name="title" value="{{ old("title", $item->title ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Category</label><select name="category" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="land" @selected(old("category", $item->category ?? "")=="land")>land</option><option value="legal" @selected(old("category", $item->category ?? "")=="legal")>legal</option><option value="company" @selected(old("category", $item->category ?? "")=="company")>company</option><option value="architectural" @selected(old("category", $item->category ?? "")=="architectural")>architectural</option><option value="financial" @selected(old("category", $item->category ?? "")=="financial")>financial</option><option value="feasibility" @selected(old("category", $item->category ?? "")=="feasibility")>feasibility</option><option value="engineering" @selected(old("category", $item->category ?? "")=="engineering")>engineering</option><option value="environmental" @selected(old("category", $item->category ?? "")=="environmental")>environmental</option><option value="regulatory" @selected(old("category", $item->category ?? "")=="regulatory")>regulatory</option><option value="budget" @selected(old("category", $item->category ?? "")=="budget")>budget</option></select></div>
      <div><label class="text-xs font-medium">Version</label><input type="text" name="version" value="{{ old("version", $item->version ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Description</label><textarea name="description" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("description", $item->description ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">File</label><input type="file" name="file_path" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><div class="text-[11px] text-[#8a9a8a]">@if(isset($item) && $item->file_path) Current: {{ $item->file_path }} @endif</div></div>
      <div><label class="text-xs font-medium">Visibility</label><select name="visibility" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="public" @selected(old("visibility", $item->visibility ?? "")=="public")>public</option><option value="private" @selected(old("visibility", $item->visibility ?? "")=="private")>private</option><option value="qualified" @selected(old("visibility", $item->visibility ?? "")=="qualified")>qualified</option></select></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
