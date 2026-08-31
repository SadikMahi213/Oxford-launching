<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SiteSetting extends Model {
    protected $fillable=['key','value_en','value_bn','type'];
    public static function getValue($key,$locale='en'){
        $s=static::where('key',$key)->first();
        if(!$s) return null;
        return $locale==='bn' && $s->value_bn ? $s->value_bn : $s->value_en;
    }
}
