<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\InvestorLead;
use App\Models\InvestorNote;
use Illuminate\Http\Request;
use App\Helpers\AuditHelper;
class InvestorLeadAdminController extends Controller {
    public function index(Request $request){
        $q=InvestorLead::query();
        if($request->filled('status')) $q->where('status',$request->status);
        if($request->filled('range')) $q->where('investment_range',$request->range);
        if($request->filled('q')) $q->where(fn($qq)=>$qq->where('name','like',"%{$request->q}%")->orWhere('email','like',"%{$request->q}%"));
        $items=$q->latest()->paginate(15)->withQueryString();
        return view('admin.investor_leads.index', compact('items'));
    }
    public function show($id){
        $item=InvestorLead::with('notes.user')->findOrFail($id);
        return view('admin.investor_leads.show', compact('item'));
    }
    public function updateStatus(Request $request,$id){
        $item=InvestorLead::findOrFail($id);
        $old=$item->status;
        $request->validate(['status'=>'required|string','admin_notes'=>'nullable|string','follow_up_date'=>'nullable|date']);
        $item->update($request->only(['status','admin_notes','follow_up_date']));
        AuditHelper::log('update_status',InvestorLead::class,$id,['status'=>$old],['status'=>$item->status]);
        return back()->with('success','Status updated');
    }
    public function addNote(Request $request,$id){
        $request->validate(['note'=>'required|string|max:2000']);
        InvestorNote::create(['investor_lead_id'=>$id,'user_id'=>auth()->id(),'note'=>$request->note]);
        return back()->with('success','Note added');
    }
    public function destroy($id){
        $item=InvestorLead::findOrFail($id);
        $item->delete();
        AuditHelper::log('delete',InvestorLead::class,$id,$item->toArray(),null);
        return redirect()->route('admin.investor-leads.index')->with('success','Lead deleted');
    }
}
