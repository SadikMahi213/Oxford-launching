@extends('layouts.admin')
@section('title','FAQ Form')
@section('content')
<a href="{{ route('admin.faqs.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} FAQ</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.faqs.update', $item->id) : route('admin.faqs.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Question EN</label><input type="text" name="question_en" value="{{ old("question_en", $item->question_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Question BN</label><input type="text" name="question_bn" value="{{ old("question_bn", $item->question_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Answer EN</label><textarea name="answer_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("answer_en", $item->answer_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Answer BN</label><textarea name="answer_bn" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("answer_bn", $item->answer_bn ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Category</label><input type="text" name="category" value="{{ old("category", $item->category ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
