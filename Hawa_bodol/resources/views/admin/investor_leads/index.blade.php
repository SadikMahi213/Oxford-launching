@extends('layouts.admin')
@section('title','Investor Leads')
@section('content')
<div class="flex justify-between items-center">
  <h1 class="font-display font-bold text-xl">Investor Leads</h1>
  <form method="GET" class="flex gap-2">
    <input name="q" value="{{ request('q') }}" placeholder="Search name/email" class="border rounded-lg px-3 py-2 text-sm">
    <select name="status" class="border rounded-lg px-3 py-2 text-sm bg-white"><option value="">All status</option>@foreach(['new','contacted','qualified','site_visit_scheduled','due_diligence','negotiation','committed','rejected','closed'] as $s)<option value="{{ $s }}" @selected(request('status')==$s)>{{ ucfirst($s) }}</option>@endforeach</select>
    <button class="bg-[#1a3a2a] text-white px-4 py-2 rounded-lg text-sm">Filter</button>
  </form>
</div>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl overflow-auto">
  <table class="w-full text-sm">
    <thead class="bg-[#f5f1e8]"><tr><th class="text-left p-3">Name</th><th class="text-left p-3">Contact</th><th class="text-left p-3">Range</th><th class="text-left p-3">Requests</th><th class="text-left p-3">Status</th><th class="p-3">Action</th></tr></thead>
    <tbody>
      @foreach($items as $it)
        <tr class="border-t">
          <td class="p-3 font-medium">{{ $it->name }} @if($it->company)<span class="text-xs text-[#6a7a6a]">({{ $it->company }})</span>@endif</td>
          <td class="p-3 text-xs">{{ $it->email }}<br>{{ $it->phone }}</td>
          <td class="p-3 text-xs">{{ $it->investment_range }}<br><span class="text-[#8a9a8a]">{{ $it->investor_type }}</span></td>
          <td class="p-3 text-xs">@if($it->request_deck)<span class="bg-[#c9a961] text-[#0f1f14] px-2 py-0.5 rounded-full text-[11px]">Deck</span>@endif @if($it->request_site_visit)<span class="bg-[#1a3a2a] text-white px-2 py-0.5 rounded-full text-[11px]">Visit</span>@endif @if($it->request_due_diligence)<span class="border px-2 py-0.5 rounded-full text-[11px]">DD</span>@endif</td>
          <td class="p-3"><span class="text-xs border px-2 py-1 rounded-full">{{ $it->status }}</span></td>
          <td class="p-3 text-center"><a href="{{ route('admin.investor-leads.show',$it->id) }}" class="text-xs bg-[#1a3a2a] text-white px-3 py-1.5 rounded-full">Manage</a></td>
        </tr>
      @endforeach
    </tbody>
  </table>
</div>
<div class="mt-4">{{ $items->links() }}</div>
@endsection
