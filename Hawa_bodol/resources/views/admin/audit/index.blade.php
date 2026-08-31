@extends('layouts.admin')
@section('title','Audit Logs')
@section('content')
<h1 class="font-display font-bold text-xl">Audit Logs</h1>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl overflow-auto">
  <table class="w-full text-xs">
    <thead class="bg-[#f5f1e8]"><tr><th class="text-left p-3">Time</th><th class="text-left p-3">User</th><th class="text-left p-3">Action</th><th class="text-left p-3">Entity</th><th class="text-left p-3">IP</th></tr></thead>
    <tbody>
      @foreach($logs as $l)
        <tr class="border-t"><td class="p-3">{{ $l->created_at->format('Y-m-d H:i') }}</td><td class="p-3">{{ $l->user->name ?? 'Guest' }}</td><td class="p-3">{{ $l->action }}</td><td class="p-3">{{ $l->entity_type }} #{{ $l->entity_id }}</td><td class="p-3">{{ $l->ip }}</td></tr>
      @endforeach
    </tbody>
  </table>
</div>
<div class="mt-4">{{ $logs->links() }}</div>
@endsection
