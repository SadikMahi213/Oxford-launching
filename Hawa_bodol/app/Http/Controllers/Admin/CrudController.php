<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Helpers\AuditHelper;
class CrudController extends Controller {
    protected $model;
    protected $viewPrefix;
    protected $routePrefix;
    protected $fillableFields = [];
    protected $uploadFields = [];
    protected $title = 'Item';

    public function index(Request $request){
        $model=$this->model;
        $query=$model::query();
        if($request->filled('q')){
            $q=$request->q;
            $query->where(function($qq) use ($q){
                foreach((new $model)->getFillable() as $f){
                    $qq->orWhere($f,'like',"%$q%");
                }
            });
        }
        $items=$query->latest()->paginate(15)->withQueryString();
        return view("admin.{$this->viewPrefix}.index", compact('items'));
    }
    public function create(){ return view("admin.{$this->viewPrefix}.form", ['item'=>null]); }
    public function store(Request $request){
        $data=$request->validate($this->rules());
        $data=$this->handleUploads($request,$data);
        $item=($this->model)::create($data);
        AuditHelper::log('create',$this->model,$item->id,null,$data);
        return redirect()->route("admin.{$this->routePrefix}.index")->with('success', $this->title.' created');
    }
    public function edit($id){
        $item=($this->model)::findOrFail($id);
        return view("admin.{$this->viewPrefix}.form", compact('item'));
    }
    public function update(Request $request,$id){
        $item=($this->model)::findOrFail($id);
        $old=$item->toArray();
        $data=$request->validate($this->rules($id));
        $data=$this->handleUploads($request,$data,$item);
        $item->update($data);
        AuditHelper::log('update',$this->model,$item->id,$old,$data);
        return redirect()->route("admin.{$this->routePrefix}.index")->with('success', $this->title.' updated');
    }
    public function destroy($id){
        $item=($this->model)::findOrFail($id);
        $item->delete();
        AuditHelper::log('delete',$this->model,$id,$item->toArray(),null);
        return redirect()->route("admin.{$this->routePrefix}.index")->with('success', $this->title.' deleted');
    }
    protected function rules($id=null){ return []; }
    protected function handleUploads(Request $request,$data,$existing=null){
        foreach($this->uploadFields as $field){
            if($request->hasFile($field)){
                if($existing && $existing->$field) Storage::disk('public')->delete($existing->$field);
                $data[$field]=$request->file($field)->store('uploads','public');
            } else {
                unset($data[$field]);
            }
        }
        return $data;
    }
}
