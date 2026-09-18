<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DueDiligenceDocument extends Model {
    protected $fillable=['title','category','version','description','file_path','file_name','visibility','investor_access','is_published'];
    protected $casts=['investor_access'=>'boolean','is_published'=>'boolean'];
}
