<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProviderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'slug' => ['sometimes', 'string', 'max:100', 'regex:/^[a-z0-9\-]+$/'],
            'base_url' => ['nullable', 'url', 'max:500'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'callback_secret' => ['nullable', 'string', 'max:500'],
            'supported_game_types' => ['nullable', 'array'],
            'supported_game_types.*' => ['string', 'in:slots,table_games,video_poker,crash,fishing,live_casino,lottery,sports,virtual_sports'],
            'min_bet' => ['nullable', 'numeric', 'min:0'],
            'max_bet' => ['nullable', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
