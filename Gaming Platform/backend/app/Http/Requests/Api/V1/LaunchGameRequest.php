<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class LaunchGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'game_id' => ['required', 'integer', 'exists:games,id'],
            'demo' => ['sometimes', 'boolean'],
        ];
    }
}
