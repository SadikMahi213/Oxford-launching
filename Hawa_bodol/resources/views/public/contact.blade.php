@extends('layouts.app')
@section('title','Contact — Hawa Bodol')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Contact</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Speak with the project team</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">For investor inquiries, site visits, or general questions. Response within 24 hours. Office, phone, email, map editable via admin.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @if(session('success'))<div class="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-sm mb-6">{{ session('success') }}</div>@endif
  @if($errors->any())<div class="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-sm mb-6"><ul>@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul></div>@endif
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 bg-white border border-[#e8e0d0] rounded-2xl p-6">
      <h3 class="font-display font-bold text-[#1a3a2a]">Send a message</h3>
      <form method="POST" action="{{ route('contact.store') }}" class="mt-4 space-y-4">
        @csrf
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="text-xs font-medium text-[#4a5a4a]">Name *</label><input name="name" required value="{{ old('name') }}" class="mt-1 w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:border-[#1a3a2a] focus:outline-none"></div>
          <div><label class="text-xs font-medium text-[#4a5a4a]">Phone</label><input name="phone" value="{{ old('phone') }}" class="mt-1 w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm"></div>
        </div>
        <div><label class="text-xs font-medium">Email *</label><input name="email" type="email" required value="{{ old('email') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
        <div><label class="text-xs font-medium">Subject</label><input name="subject" value="{{ old('subject') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
        <div><label class="text-xs font-medium">Message *</label><textarea name="message" rows="5" required class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">{{ old('message') }}</textarea></div>
        <button type="submit" class="bg-[#1a3a2a] text-white px-7 py-3 rounded-full text-sm font-medium">Send Message →</button>
      </form>
    </div>
    <div class="space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Project Location</h3>
        <p class="text-sm text-[#6a7a6a] mt-2">Ruposhi Para / Lama<br>Bandarban, Bangladesh<br>Near Matamuhuri River</p>
        <div class="mt-4 h-44 rounded-xl bg-[#f5f1e8] border border-[#e8e0d0] flex items-center justify-center text-xs text-[#8b6f47]">Map embed — admin configurable</div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-[#6a7a6a]">Email</span><span class="font-medium">hello@hawabodol.com</span></div>
          <div class="flex justify-between"><span class="text-[#6a7a6a]">Phone</span><span class="font-medium">+880 1XXX-XXXXXX</span></div>
          <div class="flex justify-between"><span class="text-[#6a7a6a]">Hours</span><span class="font-medium">Sat–Thu 9am–6pm</span></div>
        </div>
      </div>
      <div class="bg-[#1a3a2a] rounded-2xl p-6 text-white">
        <h3 class="font-bold">Prefer to invest directly?</h3>
        <p class="text-xs text-white/70 mt-1">Use the investor inquiry form for deck, site visit, and diligence.</p>
        <a href="{{ route('investor.inquiry') }}" class="mt-4 block text-center bg-[#c9a961] text-[#0f1f14] py-2.5 rounded-full text-sm font-semibold">Become an Investor →</a>
      </div>
    </div>
  </div>
</div>
@endsection
