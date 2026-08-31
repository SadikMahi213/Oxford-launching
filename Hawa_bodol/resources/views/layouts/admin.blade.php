<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>@yield('title','Admin — Hawa Bodol')</title>
@vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body class="bg-[#f6f3ea] text-[#1a2e1a]">
<div class="flex min-h-screen">
  <aside class="w-[260px] bg-[#0f1f14] text-[#e8e0d0] hidden lg:block sticky top-0 h-screen overflow-auto">
    <div class="p-5 flex items-center gap-3 border-b border-[#1f3320]">
      <div class="w-8 h-8 rounded bg-[#c9a961] flex items-center justify-center text-[#0f1f14] font-bold">হা</div>
      <div><div class="font-display font-bold text-white text-sm">Hawa Bodol</div><div class="text-[10px] tracking-widest uppercase text-[#c9a961]">Admin Panel</div></div>
    </div>
    <nav class="p-3 space-y-1 text-sm">
      <a href="{{ route('admin.dashboard') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320] {{ request()->routeIs('admin.dashboard')?'bg-[#1f3320] text-white':'' }}">Dashboard</a>
      <div class="text-[11px] tracking-widest uppercase text-[#8a9a8a] mt-4 px-3">Investor CRM</div>
      <a href="{{ route('admin.investor-leads.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Investor Leads</a>
      <a href="{{ route('admin.site-visits.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Site Visits</a>
      <a href="{{ route('admin.contacts.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Contact Messages</a>
      <a href="{{ route('admin.documents.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Documents</a>
      <div class="text-[11px] tracking-widest uppercase text-[#8a9a8a] mt-4 px-3">Content</div>
      <a href="{{ route('admin.funding.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Funding Allocations</a>
      <a href="{{ route('admin.financials.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Financial Scenarios</a>
      <a href="{{ route('admin.cottages.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Cottages</a>
      <a href="{{ route('admin.facilities.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Facilities</a>
      <a href="{{ route('admin.experiences.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Experiences</a>
      <a href="{{ route('admin.masterplan.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Masterplan</a>
      <a href="{{ route('admin.market-stats.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Market Stats</a>
      <a href="{{ route('admin.competitors.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Competitors</a>
      <a href="{{ route('admin.milestones.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Milestones</a>
      <a href="{{ route('admin.team.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Team</a>
      <a href="{{ route('admin.gallery.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Gallery</a>
      <a href="{{ route('admin.blog.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Blog</a>
      <a href="{{ route('admin.faqs.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">FAQs</a>
      <a href="{{ route('admin.risks.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Risks</a>
      <a href="{{ route('admin.investment-terms.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Investment Terms</a>
      <a href="{{ route('admin.settings.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Site Settings</a>
      <a href="{{ route('admin.audit.index') }}" class="block px-3 py-2 rounded hover:bg-[#1f3320]">Audit Logs</a>
    </nav>
    <div class="p-3 border-t border-[#1f3320] mt-4">
      <div class="text-xs text-[#8a9a8a]">{{ auth()->user()->name }} — {{ auth()->user()->email }}</div>
      <form method="POST" action="{{ route('logout') }}" class="mt-2">@csrf<button class="text-xs border border-[#c9a961] text-[#c9a961] px-3 py-1.5 rounded-full w-full">Logout</button></form>
      <a href="/" class="block text-center text-xs text-white/60 mt-2 hover:text-white">← View Website</a>
    </div>
  </aside>
  <div class="flex-1">
    <div class="lg:hidden bg-[#0f1f14] text-white p-4 flex justify-between items-center">
      <div class="font-bold">Hawa Bodol Admin</div>
      <a href="/" class="text-xs border border-white/20 px-3 py-1.5 rounded-full">Website</a>
    </div>
    <div class="max-w-[1280px] mx-auto p-4 lg:p-6">
      @if(session('success'))<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm mb-4">{{ session('success') }}</div>@endif
      @if($errors->any())<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm mb-4"><ul>@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul></div>@endif
      @yield('content')
    </div>
  </div>
</div>
</body>
</html>
