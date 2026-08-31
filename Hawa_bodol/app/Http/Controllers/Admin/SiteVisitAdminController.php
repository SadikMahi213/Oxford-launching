<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use Illuminate\Http\Request;
use App\Helpers\AuditHelper;
class SiteVisitAdminController extends Controller {
    public function index(){
        $items=SiteVisit::latest()->paginate(15);
        return view('admin.site_visits.index', compact('items'));
    }
    public function update(Request $request,$id){
        $item=SiteVisit::findOrFail($id);
        $old=$item->status;
        $request->validate(['status'=>'required|string']);
        $item->update(['status'=>$request->status]);
        AuditHelper::log('update_status',SiteVisit::class,$id,['status'=>$old],['status'=>$item->status]);
        return back()->with('success','Status updated');
    }
    public function destroy($id){ SiteVisit::findOrFail($id)->delete(); return back()->with('success','Deleted'); }
}
