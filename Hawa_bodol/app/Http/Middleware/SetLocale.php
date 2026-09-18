<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
class SetLocale {
    public function handle(Request $request, Closure $next): Response {
        $locale = session('locale', 'en');
        if(in_array($request->segment(1), ['en','bn'])){
            $locale = $request->segment(1);
            session(['locale'=>$locale]);
        }
        app()->setLocale($locale);
        return $next($request);
    }
}
