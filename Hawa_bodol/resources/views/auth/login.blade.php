@extends('layouts.app')
@section('title','Admin Login — Hawa Bodol')
@section('content')
<div class="max-w-[420px] mx-auto px-4 py-14">
  <div class="bg-white border border-[#e8e0d0] rounded-2xl p-6">
    <h1 class="font-display font-bold text-lg text-[#1a3a2a]">Admin Login</h1>
    <p class="text-xs text-[#6a7a6a] mt-1">Restricted to authorized admins.</p>
    @if($errors->any())<div class="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs mt-3">@foreach($errors->all() as $e)<div>{{ $e }}</div>@endforeach</div>@endif
    <form method="POST" action="{{ route('login.post') }}" class="mt-5 space-y-4">
      @csrf
      <div><label class="text-xs font-medium">Email</label><input name="email" type="email" required value="{{ old('email') }}" class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
      <div><label class="text-xs font-medium">Password</label><input name="password" type="password" required class="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"></div>
      <label class="flex items-center gap-2 text-xs"><input type="checkbox" name="remember"> Remember me</label>
      <button class="w-full bg-[#1a3a2a] text-white py-3 rounded-full text-sm font-medium">Login →</button>
    </form>
    <p class="text-[11px] text-[#8a9a8a] mt-3 text-center">Demo: admin@hawabodol.com / password</p>
  </div>
</div>
@endsection
