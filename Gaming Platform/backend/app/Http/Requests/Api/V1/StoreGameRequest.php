<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'provider_id' => ['required', 'integer', 'exists:game_providers,id'],
            'category_id' => ['nullable', 'integer', 'exists:game_categories,id'],
            'name' => ['required', 'string', 'max:200'],
            'slug' => ['required', 'string', 'max:200', 'regex:/^[a-z0-9\-]+$/'],
            'external_game_id' => ['required', 'string', 'max:200'],
            'game_type' => ['required', 'string', 'in:slots,table_games,video_poker,crash,fishing,live_casino,lottery,sports,virtual_sports'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'metadata' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'has_demo' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
        ];
    }
}
