<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GameSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'game_id' => $this->game_id,
            'provider_id' => $this->provider_id,
            'external_session_id' => $this->external_session_id,
            'status' => $this->status,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'launch_data' => $this->launch_data,
            'ended_at' => $this->ended_at?->toISOString(),
            'game' => new GameResource($this->whenLoaded('game')),
            'provider' => new GameProviderResource($this->whenLoaded('provider')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
