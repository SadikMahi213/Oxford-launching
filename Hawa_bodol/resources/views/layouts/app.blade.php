<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" class="scroll-smooth">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title','হাওয়া বদল — Hawa Bodol | Premium Nature Resort, Bandarban')</title>
<meta name="description" content="@yield('meta_description','Hawa Bodol — 21 bigha premium nature resort on Matamuhuri River, Bandarban. Heritage-inspired hospitality investment. BDT 3 Crore opportunity.')">
<meta property="og:title" content="@yield('title','Hawa Bodol')">
<meta property="og:description" content="@yield('meta_description','Premium nature resort investment in Bandarban')">
<meta property="og:type" content="website">
<meta property="og:image" content="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Noto+Serif+Bengali:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600&display=swap" rel="stylesheet">
@vite(['resources/css/app.css','resources/js/app.js'])
<style>
  .font-display{font-family:'Playfair Display',serif}
  .font-bn{font-family:'Hind Siliguri','Noto Serif Bengali',serif}
</style>
</head>
<body class="antialiased bg-[#fdfcf8] text-[#1a2e1a]">
@include('components.navbar')
<main>@yield('content')</main>
@include('components.footer')
@include('components.mobile-cta')
@stack('scripts')
</body>
</html>
