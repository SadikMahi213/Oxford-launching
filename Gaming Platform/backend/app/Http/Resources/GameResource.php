<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GameResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider_id' => $this->provider_id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'external_game_id' => $this->external_game_id,
            'game_type' => $this->game_type,
            'thumbnail_url' => $this->thumbnail_url,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'is_active' => $this->is_active,
            'has_demo' => $this->has_demo,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            'provider' => new GameProviderResource($this->whenLoaded('provider')),
            'category' => new GameCategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
