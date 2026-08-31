@extends('layouts.app')
@section('title','FAQ — Investor Questions')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">FAQ</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">Investor Questions — Answered Transparently</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">20+ questions covering land, fundraising, structure, ROI, risks, reporting, and site visits. All editable via admin.</p>
  </div>
</section>

<div class="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="space-y-3" x-data="{open:0}">
    @forelse($all as $idx=>$f)
      <div class="bg-white border border-[#e8e0d0] rounded-2xl">
        <button @click="open=== {{ $idx }} ? open=-1 : open={{ $idx }}" class="w-full text-left p-5 flex justify-between gap-4">
          <span class="font-medium text-sm text-[#1a3a2a]">{{ $f->question_en }}</span>
          <span class="text-[#c9a961]">+</span>
        </button>
        <div x-show="open==={{ $idx }}" class="px-5 pb-5 text-sm text-[#4a5a4a] leading-relaxed">{{ $f->answer_en }}</div>
      </div>
    @empty
      @php $fallFaqs=[
        ['What is Hawa Bodol?','A premium nature resort concept on 21 bigha in Ruposhi Para/Lama, Bandarban — heritage-inspired, riverfront, low-density (~18 cottages). Subject to approvals.'],
        ['Where is the property?','Ruposhi Para/Lama, Lama Upazila, Bandarban — Chittagong–Bandarban highway, Matamuhuri River on one side, hills on the other. 5–10km from Lama, 30–35km from Bandarban town.'],
        ['How large is the property?','21 bigha (~7 acres). Conceptual masterplan: 15–25 cottages on 5–7 bigha, remainder landscape/conservation/future expansion.'],
        ['Total fundraising requirement?','BDT 3 crore — indicative target, editable via admin. Covers construction, facilities, landscaping, utilities, working capital, professional/legal, contingency.'],
        ['How will funds be used?','Admin-managed allocations: e.g., Construction 60% (1.8Cr), Facilities 20% (60L), others landsc./utilities/working capital/contingency. All editable.'],
        ['Proposed capacity?','Approximately 18 cottages (6 river-view villa, 6 mountain cottage, 4 family suite, 2 premium suite) — conceptual, subject to approvals.'],
        ['Investment structure?','Proposed Project Company/SPV — investors own equity in dedicated company. Ring-fenced liability. Subject to final legal structuring and shareholder agreement.'],
        ['Is land legally verified?','40-year registration — requires lawyer verification of deed, mutation, khatian, encumbrance, inheritance, Hill/forest classification. Summary for qualified investors; full review on site.'],
        ['What approvals are required?','Building permission (Union/Upazila + Hill District Council NOC), DoE Environmental Clearance, Forest clearance if applicable, tourism registration, fire safety, trade license, VAT/TIN.'],
        ['Major risks?','Land title, regulatory delays, flooding/erosion/landslide, seasonal demand (monsoon 20–30%), cost overruns, management. Each mitigated — see Risk page.'],
        ['How will investors receive reports?','Intended: quarterly project update + financials, budget vs actual, milestones, risks, annual meeting. No claim of audited reports unless they exist.'],
        ['Expected timeline?','Phased: legal/design 3–4mo, approvals 2–3mo, infrastructure 4–5mo, cottages 6–8mo, landscape 2–3mo, soft launch 1mo — indicative, admin editable.'],
        ['Exit strategy?','Share buyback, acquisition, IPO potential — detailed in shareholder agreement. No guarantee.'],
        ['Can investors visit the site?','Yes — Schedule a Site Visit. Preferred date, visitors, contact. Statuses: pending/confirmed/completed/cancelled.'],
        ['Can investors review due diligence?','Yes — qualified investors after admin approval. Redacted deed, mutation summary, lawyer summary via secure portal. Never public.'],
        ['What is projected ROI?','Conservative 31% / Base 51% / Optimistic 77% — indicative only, not guaranteed. Based on 45%/55%/65% occupancy, ADR 8k/10k/12k. Break-even 25–35%.'],
        ['What if occupancy is low?','Sensitivity at 30–40% — break-even ~30–35%. Conservative modeling mitigates volatility. Working capital reserve 6 months.'],
        ['Army camp nearby?','Positive: security/emergency. Negative: drone/noise restrictions. Mitigation: NOC from commandant, transparent disclosure, restrict drones.'],
        ['Relationship with indigenous communities?','Respectful, consent-based, fair compensation, community participation, benefit-sharing (e.g., 1–2% revenue). No exploitation.'],
        ['How to become an investor?','Submit Investor Inquiry (name, email, phone, location, range, timeline, type, deck/site/diligence requests). Admin qualifies → site visit → diligence → discussion. Not a commitment.'],
      ]; @endphp
      @foreach($fallFaqs as $idx2=>[$q,$a])
        <div class="bg-white border border-[#e8e0d0] rounded-2xl" x-data="{o: {{ $idx2==0 ? 'true':'false' }}}">
          <button @click="o=!o" class="w-full text-left p-5 flex justify-between gap-4"><span class="font-medium text-sm text-[#1a3a2a]">{{ $q }}</span><span class="text-[#c9a961]" x-text="o? '—':'+'"></span></button>
          <div x-show="o" class="px-5 pb-5 text-sm text-[#4a5a4a] leading-relaxed">{{ $a }}</div>
        </div>
      @endforeach
    @endforelse
  </div>
  <div class="mt-8 bg-[#1a3a2a] rounded-2xl p-6 text-white flex flex-col sm:flex-row justify-between gap-4 items-center">
    <div><h3 class="font-bold">Still have questions?</h3><p class="text-xs text-white/70">Contact us or request the diligence pack.</p></div>
    <div class="flex gap-2"><a href="/contact" class="border border-white/20 px-5 py-2.5 rounded-full text-sm">Contact →</a><a href="/investor-inquiry" class="bg-[#c9a961] text-[#0f1f14] px-5 py-2.5 rounded-full text-sm font-semibold">Ask an Investor Question →</a></div>
  </div>
</div>
@endsection
