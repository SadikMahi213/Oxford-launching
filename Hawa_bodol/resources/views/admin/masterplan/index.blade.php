@extends('layouts.admin')
@section('title','Masterplan Zone')
@section('content')
<div class="flex justify-between items-center">
  <h1 class="font-display font-bold text-xl">Masterplan Zone</h1>
  <a href="{{ route('admin.masterplan.create') }}" class="bg-[#1a3a2a] text-white px-5 py-2 rounded-full text-sm">+ Add New</a>
</div>
<div class="mt-4 bg-white border border-[#e8e0d0] rounded-2xl overflow-auto">
  <table class="w-full text-sm">
    <thead class="bg-[#f5f1e8]"><tr><th class="text-left p-3">#</th><th class="text-left p-3">Title / Name</th><th class="text-left p-3">Details</th><th class="p-3">Actions</th></tr></thead>
    <tbody>
      @forelse($items as $it)
        <tr class="border-t">
          <td class="p-3">{{ $it->id }}</td>
          <td class="p-3 font-medium">{{ $it->title_en ?? $it->name ?? $it->metric_en ?? $it->question_en ?? $it->key ?? $it->title ?? '—' }}</td>
          <td class="p-3 text-xs text-[#6a7a6a]">{{ \Illuminate\Support\Str::limit(json_encode($it->toArray()),120) }}</td>
          <td class="p-3">
            <div class="flex gap-1 justify-center">
              <a href="{{ route('admin.masterplan.edit', $it->id) }}" class="bg-white border px-3 py-1 rounded-full text-xs">Edit</a>
              <form method="POST" action="{{ route('admin.masterplan.destroy', $it->id) }}" onsubmit="return confirm('Delete?')">@csrf @method('DELETE')<button class="bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs">Delete</button></form>
            </div>
          </td>
        </tr>
      @empty
        <tr><td colspan="4" class="p-8 text-center text-sm text-[#8a9a8a]">No items yet — click Add New.</td></tr>
      @endforelse
    </tbody>
  </table>
</div>
<div class="mt-4">{{ $items->links() }}</div>
@endsection
