<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use App\Helpers\AuditHelper;
class ContactAdminController extends Controller {
    public function index(Request $request){
        $q=ContactMessage::query();
        if($request->filled('status')) $q->where('status',$request->status);
        if($request->filled('q')) $q->where(fn($qq)=>$qq->where('name','like',"%{$request->q}%")->orWhere('email','like',"%{$request->q}%"));
        $items=$q->latest()->paginate(15)->withQueryString();
        return view('admin.contacts.index', compact('items'));
    }
    public function show($id){ $item=ContactMessage::findOrFail($id); return view('admin.contacts.show', compact('item')); }
    public function update(Request $request,$id){
        $item=ContactMessage::findOrFail($id);
        $old=$item->toArray();
        $data=$request->validate(['status'=>'required|string','admin_notes'=>'nullable|string']);
        $item->update($data);
        AuditHelper::log('update',ContactMessage::class,$id,$old,$data);
        return back()->with('success','Updated');
    }
    public function destroy($id){ $item=ContactMessage::findOrFail($id); $item->delete(); return redirect()->route('admin.contacts.index')->with('success','Deleted'); }
}
