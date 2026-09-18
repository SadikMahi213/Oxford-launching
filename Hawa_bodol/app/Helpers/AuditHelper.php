<?php
namespace App\Helpers;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
class AuditHelper {
    public static function log($action,$entityType=null,$entityId=null,$old=null,$new=null){
        AuditLog::create([
            'user_id'=>Auth::id(),
            'action'=>$action,
            'entity_type'=>$entityType,
            'entity_id'=>$entityId,
            'old_value'=> $old ? json_encode($old) : null,
            'new_value'=> $new ? json_encode($new) : null,
            'ip'=> request()->ip(),
        ]);
    }
}
