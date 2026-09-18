@extends('layouts.app')
@section('title','Risk & Due Diligence — Transparent Disclosure')
@section('content')
<section class="bg-[#1a3a2a] text-white">
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-xs tracking-[0.2em] uppercase text-[#c9a961]">Risk & Due Diligence</div>
    <h1 class="font-display text-[28px] lg:text-[40px] font-bold mt-2">We do not hide risks — we mitigate them</h1>
    <p class="text-sm text-white/70 mt-3 max-w-2xl">Every risk shows Impact → Mitigation → Verification status. Credibility comes from transparency, not from pretending risks do not exist.</p>
  </div>
</section>

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
  @php $cats=['land'=>'Land Risk','regulatory'=>'Regulatory Risk','environmental'=>'Environmental Risk','market'=>'Market Risk','construction'=>'Construction Risk','operational'=>'Operational Risk']; @endphp
  <div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      @foreach($cats as $key=>$label)
        <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
          <h3 class="font-display font-bold text-[#1a3a2a]">{{ $label }}</h3>
          @php $items = $risks[$key] ?? collect(); @endphp
          @if($items->count())
            <div class="mt-4 space-y-4">
              @foreach($items as $r)
                <div class="border border-[#e8e0d0] rounded-xl p-4 bg-[#fdfcf8]">
                  <h4 class="font-medium text-sm text-[#1a3a2a]">{{ $r->title_en }} <span class="ml-2 text-[11px] px-2 py-0.5 rounded-full {{ $r->severity=='high'?'bg-red-100 text-red-800':($r->severity=='medium'?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800') }}">{{ $r->severity }}</span> <span class="text-[11px] bg-white border px-2 py-0.5 rounded-full">{{ $r->verification_status }}</span></h4>
                  <div class="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
                    <div><div class="font-medium text-[#8b6f47]">Risk</div><div class="text-[#6a7a6a]">{{ $r->risk_en }}</div></div>
                    <div><div class="font-medium text-[#8b6f47]">Impact</div><div class="text-[#6a7a6a]">{{ $r->impact_en }}</div></div>
                    <div><div class="font-medium text-[#8b6f47]">Mitigation</div><div class="text-[#6a7a6a]">{{ $r->mitigation_en }}</div></div>
                  </div>
                </div>
              @endforeach
            </div>
          @else
            <div class="mt-4 space-y-3">
              @if($key=='land')
                <div class="border rounded-xl p-4 bg-[#fdfcf8]"><h4 class="font-medium text-sm">Title / Mutation / Khatian / Encumbrance <span class="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">medium</span></h4><div class="grid sm:grid-cols-3 gap-3 text-xs mt-2"><div><div class="font-medium text-[#8b6f47]">Risk</div><div class="text-[#6a7a6a]">40-yr registration requires verification of mutation, khatian, inheritance, Hill classification.</div></div><div><div class="font-medium text-[#8b6f47]">Impact</div><div class="text-[#6a7a6a]">High — litigation, delay.</div></div><div><div class="font-medium text-[#8b6f47]">Mitigation</div><div class="text-[#6a7a6a]">Lawyer verification, encumbrance cert, redacted deed for qualified investors.</div></div></div></div>
              @elseif($key=='environmental')
                <div class="border rounded-xl p-4 bg-[#fdfcf8]"><h4 class="font-medium text-sm">Flooding / Erosion / Landslide <span class="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full">high</span></h4><div class="grid sm:grid-cols-3 gap-3 text-xs mt-2"><div><div class="font-medium text-[#8b6f47]">Risk</div><div class="text-[#6a7a6a]">Monsoon flood, river erosion, hill landslide.</div></div><div><div class="font-medium text-[#8b6f47]">Impact</div><div class="text-[#6a7a6a]">Property damage, safety.</div></div><div><div class="font-medium text-[#8b6f47]">Mitigation</div><div class="text-[#6a7a6a]">Hydrologist, 3–5m elevation, 30–50m river setback, retaining walls, drainage, geotechnical survey.</div></div></div></div>
              @elseif($key=='regulatory')
                <div class="border rounded-xl p-4 bg-[#fdfcf8]"><h4 class="font-medium text-sm">Hill District / DoE / Fire / Tourism <span class="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">high</span></h4><div class="grid sm:grid-cols-3 gap-3 text-xs mt-2"><div><div class="font-medium text-[#8b6f47]">Risk</div><div class="text-[#6a7a6a]">Building permission, ECC, tourism registration, Hill NOC required.</div></div><div><div class="font-medium text-[#8b6f47]">Impact</div><div class="text-[#6a7a6a]">Halted construction/operation.</div></div><div><div class="font-medium text-[#8b6f47]">Mitigation</div><div class="text-[#6a7a6a]">Checklist, lawyer + Hill District Council engagement before fundraising.</div></div></div></div>
              @else
                <p class="text-xs text-[#8a9a8a]">No risks in this category yet — add via admin.</p>
              @endif
            </div>
          @endif
        </div>
      @endforeach
    </div>
    <div class="space-y-6">
      <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
        <h3 class="font-medium text-[#1a3a2a]">Due Diligence Room</h3>
        <p class="text-xs text-[#6a7a6a] mt-1">Sensitive documents never publicly accessible. Qualified investors get controlled access after admin approval.</p>
        <ul class="mt-3 space-y-1.5 text-xs text-[#4a5a4a]">
          <li>• Land docs (redacted deed, mutation summary)</li>
          <li>• Lawyer verification summary</li>
          <li>• Company / SPV docs</li>
          <li>• Architectural & financial model</li>
          <li>• Environmental / engineering reports</li>
          <li>• Regulatory approvals</li>
        </ul>
        <a href="/investor-inquiry" class="mt-4 block text-center bg-[#1a3a2a] text-white py-2.5 rounded-full text-sm">Request Due Diligence Pack →</a>
        <p class="text-[11px] text-[#8a9a8a] mt-2 text-center">Public sees: “Available to qualified investors.”</p>
      </div>
      <div class="bg-[#1a3a2a] rounded-2xl p-6 text-white">
        <h3 class="font-bold">Checklist for Counsel</h3>
        <p class="text-xs text-white/70 mt-1">Engage Hill District land lawyer to verify before fundraising — written approvals required.</p>
        <a href="/investor-inquiry" class="mt-4 block text-center border border-white/20 py-2.5 rounded-full text-sm">Contact Project Team →</a>
      </div>
    </div>
  </div>
</div>
@endsection
