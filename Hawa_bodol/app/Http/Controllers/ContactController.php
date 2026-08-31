<?php
namespace App\Http\Controllers;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
class ContactController extends Controller {
    public function store(Request $request){
        $data=$request->validate([
            'name'=>'required|string|max:255',
            'email'=>'required|email',
            'phone'=>'nullable|string|max:30',
            'subject'=>'nullable|string|max:255',
            'message'=>'required|string|max:3000',
        ]);
        ContactMessage::create($data);
        return back()->with('success','Message sent successfully. We will respond within 24 hours.');
    }
}
