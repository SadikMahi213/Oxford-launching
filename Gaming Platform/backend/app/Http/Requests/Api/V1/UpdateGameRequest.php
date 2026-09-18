<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:game_categories,id'],
            'name' => ['sometimes', 'string', 'max:200'],
            'slug' => ['sometimes', 'string', 'max:200', 'regex:/^[a-z0-9\-]+$/'],
            'external_game_id' => ['sometimes', 'string', 'max:200'],
            'game_type' => ['sometimes', 'string', 'in:slots,table_games,video_poker,crash,fishing,live_casino,lottery,sports,virtual_sports'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'metadata' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'has_demo' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
        ];
    }
}
