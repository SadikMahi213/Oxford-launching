<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    protected $fillable=['user_id','action','entity_type','entity_id','old_value','new_value','ip'];
    public function user(){ return $this->belongsTo(User::class); }
}
