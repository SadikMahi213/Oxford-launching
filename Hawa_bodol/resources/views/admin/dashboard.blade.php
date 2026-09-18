@extends('layouts.admin')
@section('title','Dashboard — Hawa Bodol Admin')
@section('content')
<h1 class="font-display text-2xl font-bold text-[#1a3a2a]">Dashboard</h1>
<p class="text-xs text-[#6a7a6a] mt-1">Premium nature resort investment — investor CRM & content management</p>

<div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
  @php $cards=[['Total Leads',$totalLeads,'bg-[#1a3a2a] text-white'],['New Leads',$newLeads,'bg-white'],['Qualified',$qualified,'bg-white'],['Site Visits',$siteVisits,'bg-white'],['Pending Visits',$pendingVisits,'bg-amber-50'],['Deck Requests',$deckRequests,'bg-white'],['DD Requests',$ddRequests,'bg-white'],['Unread Contacts',$contactUnread,'bg-red-50']]; @endphp
  @foreach($cards as [$label,$val,$cls])
    <div class="rounded-2xl border border-[#e8e0d0] p-4 {{ $cls }}">
      <div class="text-xs tracking-widest uppercase {{ str_contains($cls,'bg-[#1a3a2a]') ? 'text-white/60' : 'text-[#8a9a8a]' }}">{{ $label }}</div>
      <div class="text-2xl font-bold mt-1 {{ str_contains($cls,'bg-[#1a3a2a]') ? 'text-[#c9a961]' : 'text-[#1a3a2a]' }}">{{ $val }}</div>
    </div>
  @endforeach
</div>

<div class="mt-6 grid lg:grid-cols-2 gap-6">
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
    <h3 class="font-medium text-[#1a3a2a]">Funding Target</h3>
    <div class="mt-3 flex items-baseline gap-2"><span class="text-2xl font-bold">BDT {{ number_format((int)$fundingTotal/10000000,2) }} Cr</span><span class="text-xs text-[#6a7a6a]">Indicative — editable via Settings</span></div>
    <div class="mt-2 h-2 bg-[#f5f1e8] rounded-full overflow-hidden"><div class="h-full bg-[#c9a961]" style="width:35%"></div></div>
    <div class="text-[11px] text-[#8a9a8a] mt-1">Progress 35% — demo, connect to real commitments via CRM.</div>
  </div>
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
    <h3 class="font-medium">Leads by Status</h3>
    <div class="mt-3 space-y-2">
      @forelse($leadsByStatus as $status=>$count)
        <div class="flex justify-between text-sm"><span>{{ ucfirst($status) }}</span><span class="font-bold">{{ $count }}</span></div>
      @empty
        <div class="text-xs text-[#8a9a8a]">No data yet</div>
      @endforelse
    </div>
  </div>
</div>

<div class="mt-6 grid lg:grid-cols-2 gap-6">
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
    <h3 class="font-medium">Recent Investor Leads</h3>
    <div class="mt-3 space-y-3">
      @forelse($recentLeads as $l)
        <div class="flex justify-between items-center border-b border-[#f5f1e8] pb-2">
          <div><div class="font-medium text-sm">{{ $l->name }} <span class="text-xs bg-[#f5f1e8] border px-2 py-0.5 rounded-full">{{ $l->status }}</span></div><div class="text-xs text-[#6a7a6a]">{{ $l->email }} • {{ $l->investment_range }}</div></div>
          <a href="{{ route('admin.investor-leads.show',$l->id) }}" class="text-xs border px-3 py-1 rounded-full">View</a>
        </div>
      @empty
        <div class="text-xs text-[#8a9a8a]">No leads yet — submit via /investor-inquiry</div>
      @endforelse
    </div>
    <a href="{{ route('admin.investor-leads.index') }}" class="mt-3 inline-block text-xs bg-[#1a3a2a] text-white px-4 py-2 rounded-full">Manage Leads →</a>
  </div>
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-5">
    <h3 class="font-medium">Leads by Investment Range</h3>
    <div class="mt-3 space-y-2">
      @forelse($leadsByRange as $range=>$cnt)
        <div class="flex justify-between text-sm"><span>{{ $range ?: 'Unspecified' }}</span><span class="font-bold">{{ $cnt }}</span></div>
      @empty
        <div class="text-xs text-[#8a9a8a]">No data</div>
      @endforelse
    </div>
    <h3 class="font-medium mt-6">Recent Contact Messages</h3>
    <div class="mt-2 space-y-2">
      @forelse($recentMessages as $m)
        <div class="text-xs border-b pb-2"><span class="font-medium">{{ $m->name }}</span> — {{ $m->subject ?? 'No subject' }} <span class="text-[#8a9a8a]">{{ $m->status }}</span></div>
      @empty
        <div class="text-xs text-[#8a9a8a]">No messages</div>
      @endforelse
    </div>
  </div>
</div>
@endsection
