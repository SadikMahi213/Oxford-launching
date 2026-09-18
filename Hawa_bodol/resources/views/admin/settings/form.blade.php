@extends('layouts.admin')
@section('title','Site Setting Form')
@section('content')
<a href="{{ route('admin.settings.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Site Setting</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.settings.update', $item->id) : route('admin.settings.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Key</label><input type="text" name="key" value="{{ old("key", $item->key ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Value EN</label><textarea name="value_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("value_en", $item->value_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Value BN</label><textarea name="value_bn" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("value_bn", $item->value_bn ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Type</label><select name="type" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="text" @selected(old("type", $item->type ?? "")=="text")>text</option><option value="textarea" @selected(old("type", $item->type ?? "")=="textarea")>textarea</option><option value="image" @selected(old("type", $item->type ?? "")=="image")>image</option></select></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
