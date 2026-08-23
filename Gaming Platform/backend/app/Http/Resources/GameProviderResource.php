<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GameProviderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'base_url' => $this->base_url,
            'is_active' => $this->is_active,
            'supported_game_types' => $this->supported_game_types,
            'min_bet' => $this->min_bet,
            'max_bet' => $this->max_bet,
            'sort_order' => $this->sort_order,
            'metadata' => $this->metadata,
            'games_count' => $this->whenCounted('games'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
