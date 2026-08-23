# Game Provider Architecture

## Overview

The game provider abstraction layer enables the platform to integrate with multiple external game providers through a unified adapter interface. Each provider implements a common contract, and the service layer orchestrates all provider interactions.

## Core Components

### GameProviderService
- Central orchestration service for all game-provider operations
- Maintains a registry of provider adapters
- Handles provider CRUD, game CRUD, category management, session lifecycle
- Delegates provider-specific logic to adapters

### GameProviderInterface (Contract)
Each provider must implement this contract:
- `getSlug()` — Unique identifier for the provider
- `listGames()` — Fetch available games from the external API
- `createSession()` — Create a game session with the provider
- `launchGame()` — Get launch URL/token for the user
- `handleCallback()` — Process provider callbacks
- `verifyCallbackSignature()` — Validate callback authenticity

### Models
- **GameProvider** — Registered game providers (e.g., "pragmatic-play", "evolution")
- **GameCategory** — Game categories (e.g., "slots", "table-games")
- **Game** — Individual games linked to a provider and optional category
- **GameSession** — User game sessions tracking launch, status, and provider data

## Database Schema

### game_providers
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| name | varchar(100) | Display name |
| slug | varchar(100) | Unique identifier |
| base_url | varchar(500) | Provider API base URL |
| api_key | varchar(500) | API authentication key |
| callback_secret | varchar(500) | Secret for callback verification |
| is_active | boolean | Whether provider is enabled |
| supported_game_types | json | Array of supported game types |
| min_bet | decimal(12,4) | Minimum bet amount |
| max_bet | decimal(12,4) | Maximum bet amount |
| sort_order | integer | Display ordering |
| metadata | json | Additional provider configuration |

### game_categories
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| name | varchar(100) | Display name |
| slug | varchar(100) | Unique identifier |
| description | varchar(500) | Optional description |
| sort_order | integer | Display ordering |

### games
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| provider_id | bigint | FK to game_providers |
| category_id | bigint | FK to game_categories (nullable) |
| name | varchar(200) | Game display name |
| slug | varchar(200) | Unique identifier |
| external_game_id | varchar(200) | Provider's game ID |
| game_type | varchar(50) | Game type enum |
| thumbnail_url | varchar(500) | Game thumbnail URL |
| description | text | Game description |
| is_active | boolean | Whether game is enabled |
| has_demo | boolean | Whether demo mode is available |
| is_featured | boolean | Whether game is featured |
| sort_order | integer | Display ordering |
| metadata | json | Additional game data |

### game_sessions
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | FK to users |
| game_id | bigint | FK to games |
| provider_id | bigint | FK to game_providers |
| external_session_id | varchar(200) | Provider's session ID |
| status | varchar(20) | Session status enum |
| ip_address | varchar(45) | User's IP address |
| user_agent | varchar(500) | User's browser string |
| launch_data | json | Launch URL/token data |
| ended_at | timestamp | Session end time |

## API Endpoints

### Public (No Auth)
- `GET /api/v1/games` — List games (filterable by provider_id, category_id, game_type, featured)
- `GET /api/v1/games/{id}` — Get single game
- `GET /api/v1/categories` — List categories

### Authenticated
- `POST /api/v1/games/launch` — Launch a game for the authenticated user
- `GET /api/v1/games/sessions` — Get user's game sessions

### Admin
- `GET /api/v1/admin/providers` — List providers
- `POST /api/v1/admin/providers` — Create provider
- `GET /api/v1/admin/providers/{id}` — Get provider details
- `PUT /api/v1/admin/providers/{id}` — Update provider
- `POST /api/v1/admin/games` — Create game
- `PUT /api/v1/admin/games/{id}` — Update game
- `POST /api/v1/admin/categories` — Create category

## Game Launch Flow

1. User selects a game → `POST /api/v1/games/launch` with `game_id`
2. Service validates game and provider are active
3. Service creates a session with the external provider via adapter
4. Local GameSession record is created
5. Adapter returns launch data (URL, session token)
6. Response includes `launch_url` and `session_token` for the frontend

## Provider Sync

- `GameProviderService::syncGamesFromProvider()` fetches games from the adapter and upserts into the local database
- New games are created, existing games are updated
- Returns counts of created/updated games
