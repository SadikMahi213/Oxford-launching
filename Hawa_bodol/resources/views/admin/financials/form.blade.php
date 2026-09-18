@extends('layouts.admin')
@section('title','Financial Scenario Form')
@section('content')
<a href="{{ route('admin.financials.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6 max-w-[720px]">
  <h2 class="font-display font-bold text-lg">{{ isset($item) ? 'Edit' : 'Create' }} Financial Scenario</h2>
  <form method="POST" action="{{ isset($item) ? route('admin.financials.update', $item->id) : route('admin.financials.store') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
    @csrf
    @if(isset($item)) @method('PUT') @endif
      <div><label class="text-xs font-medium">Name</label><select name="name" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select</option><option value="conservative" @selected(old("name", $item->name ?? "")=="conservative")>conservative</option><option value="base" @selected(old("name", $item->name ?? "")=="base")>base</option><option value="optimistic" @selected(old("name", $item->name ?? "")=="optimistic")>optimistic</option></select></div>
      <div><label class="text-xs font-medium">Label EN</label><input type="text" name="label_en" value="{{ old("label_en", $item->label_en ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Label BN</label><input type="text" name="label_bn" value="{{ old("label_bn", $item->label_bn ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Rooms</label><input type="number" step="any" name="rooms" value="{{ old("rooms", $item->rooms ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">ADR</label><input type="number" step="any" name="adr" value="{{ old("adr", $item->adr ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Occupancy %</label><input type="number" step="any" name="occupancy" value="{{ old("occupancy", $item->occupancy ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Room Revenue</label><input type="number" step="any" name="room_revenue" value="{{ old("room_revenue", $item->room_revenue ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Total Revenue</label><input type="number" step="any" name="total_revenue" value="{{ old("total_revenue", $item->total_revenue ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Opex %</label><input type="number" step="any" name="opex_percent" value="{{ old("opex_percent", $item->opex_percent ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">EBITDA</label><input type="number" step="any" name="ebitda" value="{{ old("ebitda", $item->ebitda ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Net Profit</label><input type="number" step="any" name="net_profit" value="{{ old("net_profit", $item->net_profit ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">ROI %</label><input type="number" step="any" name="roi" value="{{ old("roi", $item->roi ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Payback Years</label><input type="number" step="any" name="payback_years" value="{{ old("payback_years", $item->payback_years ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Break-even %</label><input type="number" step="any" name="break_even_occupancy" value="{{ old("break_even_occupancy", $item->break_even_occupancy ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-medium">Order</label><input type="number" step="any" name="order" value="{{ old("order", $item->order ?? "") }}" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></div>
    <button type="submit" class="bg-[#1a3a2a] text-white px-6 py-3 rounded-full text-sm font-medium">{{ isset($item) ? 'Update' : 'Create' }}</button>
  </form>
</div>
@endsection
