@extends('layouts.app')
@section('title','Investor Inquiry — Hawa Bodol')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Investor Inquiry</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Start a conversation about investing</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Serious lead-generation — not a commitment. Submitting does not constitute offer, acceptance, or investment commitment.</p>
  </div>
</section>

<div class="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @if(session('success'))<div class="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-sm mb-6">{{ session('success') }}</div>@endif
  @if($errors->any())<div class="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm mb-6"><ul>@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul></div>@endif
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6 lg:p-8">
    <form method="POST" action="{{ route('investor.lead.store') }}" class="space-y-4">
      @csrf
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="text-xs font-medium">Full Name *</label><input name="name" required value="{{ old('name') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
        <div><label class="text-xs font-medium">Company</label><input name="company" value="{{ old('company') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="text-xs font-medium">Email *</label><input name="email" type="email" required value="{{ old('email') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
        <div><label class="text-xs font-medium">Phone *</label><input name="phone" required value="{{ old('phone') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="text-xs font-medium">Location</label><input name="location" value="{{ old('location') }}" placeholder="Dhaka, Chittagong..." class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
        <div><label class="text-xs font-medium">Investor Type</label>
          <select name="investor_type" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="">Select</option><option>Individual</option><option>Business</option><option>Corporate</option><option>Family Office</option><option>Strategic Partner</option><option>Other</option>
          </select>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="text-xs font-medium">Investment Interest</label>
          <select name="investment_range" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="">Select</option><option>Below BDT 10 lakh</option><option>BDT 10–25 lakh</option><option>BDT 25–50 lakh</option><option>BDT 50 lakh–1 crore</option><option>BDT 1 crore+</option><option>Prefer to discuss</option>
          </select>
        </div>
        <div><label class="text-xs font-medium">Timeline</label>
          <select name="investment_timeline" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="">Select</option><option>Immediate</option><option>Within 3 months</option><option>Within 6 months</option><option>Within 12 months</option>
          </select>
        </div>
      </div>
      <div><label class="text-xs font-medium">Message</label><textarea name="message" rows="4" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">{{ old('message') }}</textarea></div>
      <div class="space-y-2 text-sm">
        <label class="flex items-center gap-2"><input type="checkbox" name="request_deck" value="1"> Request Investor Deck</label>
        <label class="flex items-center gap-2"><input type="checkbox" name="request_site_visit" value="1"> Request Site Visit</label>
        <label class="flex items-center gap-2"><input type="checkbox" name="request_due_diligence" value="1"> Request Due Diligence Pack</label>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900">Submitting this form does not constitute an offer, acceptance, or investment commitment. Investment terms subject to final legal documentation and independent advice.</div>
      <button type="submit" class="w-full bg-[#1a3a2a] text-white py-3.5 rounded-full font-semibold hover:bg-[#0f281c]">Submit Inquiry →</button>
    </form>
  </div>
  <div class="mt-6 grid sm:grid-cols-3 gap-4 text-xs">
    <div class="bg-white border rounded-xl p-4"><div class="font-medium">Site Visit</div><div class="text-[#6a7a6a]">After qualification, schedule a visit with the team.</div></div>
    <div class="bg-white border rounded-xl p-4"><div class="font-medium">Due Diligence</div><div class="text-[#6a7a6a]">Secure portal for qualified investors.</div></div>
    <div class="bg-white border rounded-xl p-4"><div class="font-medium">Reporting</div><div class="text-[#6a7a6a]">Quarterly updates, annual meeting.</div></div>
  </div>
</div>
@endsection
