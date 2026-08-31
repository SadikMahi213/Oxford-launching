<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Faq extends Model {
    protected $fillable=['question_en','question_bn','answer_en','answer_bn','category','order','is_published'];
    protected $casts=['is_published'=>'boolean'];
}
