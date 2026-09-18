<header x-data="{open:false}" class="sticky top-0 z-50 bg-[#fdfcf8]/95 backdrop-blur border-b border-[#e8e0d0]">
<div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
<div class="flex items-center justify-between h-[68px]">
  <a href="{{ route('home') }}" class="flex items-center gap-3">
    <div class="w-9 h-9 rounded bg-[#1a3a2a] flex items-center justify-center text-[#c9a961] font-display font-bold text-lg">হা</div>
    <div>
      <div class="font-display font-bold text-[#1a3a2a] leading-none text-[18px]">হাওয়া বদল</div>
      <div class="text-[10px] tracking-[0.22em] text-[#8b6f47] uppercase font-medium">Hawa Bodol • Bandarban</div>
    </div>
  </a>
  <nav class="hidden lg:flex items-center gap-1 text-[13px] font-medium">
    @php $nav=[['/','Home'],['/property','Property'],['/resort','Resort'],['/market','Market'],['/investment','Investment'],['/financials','Financials'],['/development','Plan'],['/risk-and-due-diligence','Risks'],['/team','Team'],['/gallery','Gallery'],['/faq','FAQ']]; @endphp
    @foreach($nav as [$href,$label])
      <a href="{{ $href }}" class="px-2.5 py-1.5 rounded hover:bg-[#f5f1e8] {{ request()->is(trim($href,'/').'*') && $href!='/' || request()->path()==trim($href,'/') ? 'text-[#1a3a2a] bg-[#f5f1e8]' : 'text-[#4a5a4a]' }}">{{ $label }}</a>
    @endforeach
  </nav>
  <div class="hidden lg:flex items-center gap-2">
    <a href="{{ route('locale.switch',['locale'=> app()->getLocale()=='en'?'bn':'en']) }}" class="text-xs border border-[#d6cbb3] px-3 py-1.5 rounded-full hover:bg-[#1a3a2a] hover:text-white transition">{{ app()->getLocale()=='en' ? 'বাংলা' : 'English' }}</a>
    <a href="{{ route('investor.inquiry') }}" class="bg-[#1a3a2a] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#0f281c] transition">Become an Investor</a>
  </div>
  <button @click="open=!open" class="lg:hidden p-2 rounded hover:bg-[#f5f1e8]">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16"/></svg>
  </button>
</div>
</div>
<div x-show="open" x-transition class="lg:hidden border-t border-[#e8e0d0] bg-white">
  <nav class="px-4 py-4 space-y-1">
    @foreach($nav as [$href,$label])
      <a href="{{ $href }}" class="block px-3 py-2.5 rounded hover:bg-[#f5f1e8] text-sm">{{ $label }}</a>
    @endforeach
    <div class="pt-3 flex gap-2">
      <a href="{{ route('contact') }}" class="flex-1 border border-[#1a3a2a] text-center py-2.5 rounded-full text-sm">Contact</a>
      <a href="{{ route('investor.inquiry') }}" class="flex-1 bg-[#1a3a2a] text-white text-center py-2.5 rounded-full text-sm">Become an Investor</a>
    </div>
  </nav>
</div>
</header>
