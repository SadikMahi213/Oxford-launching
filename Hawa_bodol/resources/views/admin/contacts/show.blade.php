@extends('layouts.admin')
@section('title','Contact Detail')
@section('content')
<a href="{{ route('admin.contacts.index') }}" class="text-sm border px-3 py-1.5 rounded-full bg-white">← Back</a>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl p-6">
  <h2 class="font-bold text-lg">{{ $item->name }} — {{ $item->subject }}</h2>
  <div class="text-xs text-[#6a7a6a] mt-1">{{ $item->email }} @if($item->phone) • {{ $item->phone }} @endif • {{ $item->created_at->format('Y-m-d H:i') }}</div>
  <div class="mt-4 bg-[#f5f1e8] border rounded-lg p-4 text-sm">{{ $item->message }}</div>
  <form method="POST" action="{{ route('admin.contacts.update',$item->id) }}" class="mt-4 space-y-3">
    @csrf @method('PUT')
    <select name="status" class="border rounded-lg px-3 py-2 text-sm bg-white"><option value="unread" @selected($item->status=='unread')>Unread</option><option value="read" @selected($item->status=='read')>Read</option><option value="replied" @selected($item->status=='replied')>Replied</option><option value="archived" @selected($item->status=='archived')>Archived</option></select>
    <textarea name="admin_notes" rows="3" placeholder="Admin notes" class="w-full border rounded-lg px-3 py-2 text-sm">{{ $item->admin_notes }}</textarea>
    <button class="bg-[#1a3a2a] text-white px-5 py-2 rounded-full text-sm">Update</button>
  </form>
</div>
@endsection
