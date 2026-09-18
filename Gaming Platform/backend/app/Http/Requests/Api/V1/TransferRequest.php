<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reference_type' => ['nullable', 'string', 'max:200'],
            'reference_id' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
