@extends('layouts.admin')
@section('title','Contact Messages')
@section('content')
<h1 class="font-display font-bold text-xl">Contact Messages</h1>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl overflow-auto">
  <table class="w-full text-sm">
    <thead class="bg-[#f5f1e8]"><tr><th class="text-left p-3">Name</th><th class="text-left p-3">Subject</th><th class="text-left p-3">Status</th><th class="text-left p-3">Date</th><th class="p-3">Action</th></tr></thead>
    <tbody>
      @foreach($items as $it)
        <tr class="border-t"><td class="p-3">{{ $it->name }}<br><span class="text-xs text-[#6a7a6a]">{{ $it->email }}</span></td><td class="p-3">{{ $it->subject ?? '—' }}</td><td class="p-3"><span class="text-xs border px-2 py-1 rounded-full">{{ $it->status }}</span></td><td class="p-3 text-xs">{{ $it->created_at->format('Y-m-d') }}</td><td class="p-3"><a href="{{ route('admin.contacts.show',$it->id) }}" class="bg-[#1a3a2a] text-white px-3 py-1 rounded-full text-xs">View</a></td></tr>
      @endforeach
    </tbody>
  </table>
</div>
<div class="mt-4">{{ $items->links() }}</div>
@endsection
