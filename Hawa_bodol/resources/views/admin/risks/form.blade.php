@extends('layouts.admin')
@section('title','Risk Form')
@section('content')
<a href="{{ route('admin.risks.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Risk</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.risks.update', $item->id) : route('admin.risks.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Title EN</label><input type="text" name="title_en" value="{{ old("title_en", $item->title_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Title BN</label><input type="text" name="title_bn" value="{{ old("title_bn", $item->title_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Category</label><select name="category" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="land" @selected(old("category", $item->category ?? "")=="land")>land</option><option value="regulatory" @selected(old("category", $item->category ?? "")=="regulatory")>regulatory</option><option value="environmental" @selected(old("category", $item->category ?? "")=="environmental")>environmental</option><option value="market" @selected(old("category", $item->category ?? "")=="market")>market</option><option value="construction" @selected(old("category", $item->category ?? "")=="construction")>construction</option><option value="operational" @selected(old("category", $item->category ?? "")=="operational")>operational</option></select></div>
      <div><label class="text-xs font-medium">Risk EN</label><textarea name="risk_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("risk_en", $item->risk_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Impact EN</label><textarea name="impact_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("impact_en", $item->impact_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Mitigation EN</label><textarea name="mitigation_en" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{{ old("mitigation_en", $item->mitigation_en ?? "") }}</textarea></div>
      <div><label class="text-xs font-medium">Severity</label><select name="severity" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="low" @selected(old("severity", $item->severity ?? "")=="low")>low</option><option value="medium" @selected(old("severity", $item->severity ?? "")=="medium")>medium</option><option value="high" @selected(old("severity", $item->severity ?? "")=="high")>high</option></select></div>
      <div><label class="text-xs font-medium">Verification</label><select name="verification_status" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="pending" @selected(old("verification_status", $item->verification_status ?? "")=="pending")>pending</option><option value="verified" @selected(old("verification_status", $item->verification_status ?? "")=="verified")>verified</option><option value="in_progress" @selected(old("verification_status", $item->verification_status ?? "")=="in_progress")>in_progress</option><option value="failed" @selected(old("verification_status", $item->verification_status ?? "")=="failed")>failed</option></select></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
