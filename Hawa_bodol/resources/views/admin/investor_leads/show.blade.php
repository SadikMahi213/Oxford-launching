@extends('layouts.admin')
@section('title','Lead Detail')
@section('content')
<a href="{{ route('admin.investor-leads.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 grid lg:grid-cols-3 gap-6">
  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h2 class="font-display font-bold text-lg">{{ $item->name }}</h2>
      <div class="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
        <div><span class="text-[#6a7a6a]">Email:</span> {{ $item->email }}</div><div><span class="text-[#6a7a6a]">Phone:</span> {{ $item->phone }}</div>
        <div><span class="text-[#6a7a6a]">Company:</span> {{ $item->company ?? '—' }}</div><div><span class="text-[#6a7a6a]">Location:</span> {{ $item->location ?? '—' }}</div>
        <div><span class="text-[#6a7a6a]">Range:</span> {{ $item->investment_range }}</div><div><span class="text-[#6a7a6a]">Type:</span> {{ $item->investor_type }}</div>
        <div><span class="text-[#6a7a6a]">Timeline:</span> {{ $item->investment_timeline }}</div><div><span class="text-[#6a7a6a]">Created:</span> {{ $item->created_at->format('Y-m-d H:i') }}</div>
      </div>
      <div class="mt-4 text-sm"><div class="font-medium">Message:</div><div class="text-[#4a5a4a] bg-[#f5f1e8] border border-[#e8e0d0] rounded-lg p-3 mt-1">{{ $item->message ?? '—' }}</div></div>
      <div class="mt-4 flex gap-2 text-xs">@if($item->request_deck)<span class="bg-[#c9a961] px-3 py-1 rounded-full">Deck requested</span>@endif @if($item->request_site_visit)<span class="bg-[#1a3a2a] text-white px-3 py-1 rounded-full">Site visit requested</span>@endif @if($item->request_due_diligence)<span class="border px-3 py-1 rounded-full">DD requested</span>@endif</div>
    </div>
    <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h3 class="font-medium">Notes / Timeline</h3>
      <div class="mt-3 space-y-3">
        @forelse($item->notes as $n)
          <div class="border border-[#e8e0d0] rounded-lg p-3 bg-[#fdfcf8]"><div class="text-xs text-[#8a9a8a]">{{ $n->created_at->format('Y-m-d H:i') }} • {{ $n->user->name ?? 'System' }}</div><div class="text-sm mt-1">{{ $n->note }}</div></div>
        @empty
          <div class="text-xs text-[#8a9a8a]">No notes yet</div>
        @endforelse
      </div>
      <form method="POST" action="{{ route('admin.investor-leads.note',$item->id) }}" class="mt-4">
        @csrf
        <textarea name="note" rows="3" required placeholder="Add a note..." class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
        <button class="mt-2 bg-[#1a3a2a] text-white px-4 py-2 rounded-full text-sm">Add Note</button>
      </form>
    </div>
  </div>
  <div class="space-y-6">
    <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h3 class="font-medium">Update Status</h3>
      <form method="POST" action="{{ route('admin.investor-leads.status',$item->id) }}" class="mt-3 space-y-3">
        @csrf @method('PUT')
        <select name="status" class="w-full border rounded-lg px-3 py-2.5 text-sm bg-white">
          @foreach(['new','contacted','qualified','site_visit_scheduled','due_diligence','negotiation','committed','rejected','closed'] as $s)
            <option value="{{ $s }}" @selected($item->status==$s)>{{ ucfirst(str_replace('_',' ',$s)) }}</option>
          @endforeach
        </select>
        <input type="date" name="follow_up_date" value="{{ $item->follow_up_date?->format('Y-m-d') }}" class="w-full border rounded-lg px-3 py-2.5 text-sm">
        <textarea name="admin_notes" rows="3" placeholder="Admin notes" class="w-full border rounded-lg px-3 py-2 text-sm">{{ $item->admin_notes }}</textarea>
        <button class="w-full bg-[#1a3a2a] text-white py-2.5 rounded-full text-sm">Update Status</button>
      </form>
      <form method="POST" action="{{ route('admin.investor-leads.destroy',$item->id) }}" onsubmit="return confirm('Delete lead?')" class="mt-3">
        @csrf @method('DELETE')
        <button class="w-full border border-red-200 text-red-700 py-2 rounded-full text-sm">Delete Lead</button>
      </form>
    </div>
  </div>
</div>
@endsection
