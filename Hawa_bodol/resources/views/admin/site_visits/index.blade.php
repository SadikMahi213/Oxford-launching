@extends('layouts.admin')
@section('title','Site Visits')
@section('content')
<h1 class="font-display font-bold text-xl">Site Visits</h1>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl overflow-auto">
  <table class="w-full text-sm">
    <thead class="bg-[#f5f1e8]"><tr><th class="text-left p-3">Name</th><th class="text-left p-3">Contact</th><th class="text-left p-3">Date</th><th class="text-left p-3">Visitors</th><th class="text-left p-3">Status</th><th class="p-3">Action</th></tr></thead>
    <tbody>
      @foreach($items as $it)
        <tr class="border-t"><td class="p-3 font-medium">{{ $it->name }}</td><td class="p-3 text-xs">{{ $it->email }}<br>{{ $it->phone }}</td><td class="p-3 text-xs">{{ $it->preferred_date?->format('Y-m-d') }}</td><td class="p-3 text-center">{{ $it->visitors }}</td><td class="p-3 text-xs">{{ $it->status }}</td><td class="p-3"><form method="POST" action="{{ route('admin.site-visits.update',$it->id) }}" class="flex gap-1">@csrf @method('PUT')<select name="status" class="border rounded px-2 py-1 text-xs"><option value="pending" @selected($it->status=='pending')>Pending</option><option value="confirmed" @selected($it->status=='confirmed')>Confirmed</option><option value="completed" @selected($it->status=='completed')>Completed</option><option value="cancelled" @selected($it->status=='cancelled')>Cancelled</option></select><button class="bg-[#1a3a2a] text-white px-2 py-1 rounded text-xs">Update</button></form></td></tr>
      @endforeach
    </tbody>
  </table>
</div>
<div class="mt-4">{{ $items->links() }}</div>
@endsection
