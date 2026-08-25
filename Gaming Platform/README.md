# Gaming Platform

A demo/simulation gaming platform built with **Laravel 12** (backend API) and **Next.js 15** (frontend). Features 100 original browser-playable games, demo credits system, user dashboard, and admin panel.

> **Note:** This is strictly a demo/simulation platform. No real money is involved. Demo credits have zero monetary value and cannot be converted to cash.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2+, Sanctum auth, spatie/laravel-permission |
| Database | PostgreSQL 16 (production) / SQLite (local dev) |
| Cache/Queue | Redis 7 (production) / File-based (local dev) |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Testing | Pest (backend) |

## Prerequisites

- **PHP 8.2+** with extensions: mbstring, xml, curl, sqlite3, bcmath
- **Composer** 2.x
- **Node.js 18+** with npm
- **Git**

Optional (production only):
- PostgreSQL 16
- Redis 7

## Local Setup (SQLite — No Docker Required)

### 1. Clone the Repository

```bash
git clone https://github.com/SadikMahi213/Gaming-Platform.git
cd Gaming-Platform
```

### 2. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

**Configure `.env` for local SQLite:**

Replace the database section in `.env` with:

```env
DB_CONNECTION=sqlite
DB_DATABASE=

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

Then create the SQLite database file:

```bash
# Create empty SQLite database (Windows)
echo. > database\database.sqlite

# On macOS/Linux:
# touch database/database.sqlite
```

**Run migrations and seed the database:**

```bash
php artisan migrate
php artisan db:seed        # Creates admin + player users + 100 games
```

**Start the backend server:**

```bash
php artisan serve --port=8080
```

Backend is now running at **http://localhost:8080**

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev -- --port=3000
```

Frontend is now running at **http://localhost:3000**

### 4. Verify Installation

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Frontend (login page) |
| http://localhost:8080/api/v1/ping | Backend health check |

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |
| Player | player@example.com | password |

## Running Tests

```bash
cd backend

# Run all tests
php artisan test

# Or with Pest directly
./vendor/bin/pest
```

## Frontend Commands

```bash
cd frontend

npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

## Project Structure

```
Gaming-Platform/
├── backend/                     # Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/   # API controllers
│   │   ├── Models/                     # Eloquent models
│   │   ├── Services/                   # Business logic
│   │   └── Http/Resources/             # API resources
│   ├── database/
│   │   ├── migrations/                 # Database migrations
│   │   └── seeders/                    # DemoGamesSeeder (100 games)
│   └── routes/api.php                 # API routes
│
├── frontend/                    # Next.js 15
│   ├── app/
│   │   ├── (dashboard)/         # User dashboard pages
│   │   │   ├── page.tsx         # Home
│   │   │   ├── games/           # Game list + play
│   │   │   ├── categories/      # Category grid
│   │   │   ├── leaderboard/     # Leaderboard
│   │   │   └── profile/         # User profile
│   │   └── admin/               # Admin panel
│   │       ├── page.tsx         # Dashboard
│   │       ├── games/           # Game management
│   │       └── categories/      # Category management
│   ├── components/
│   │   └── games/engines/       # 100 playable game components
│   └── lib/
│       ├── api/                 # API client (apiFetch, apiFetchEnvelope)
│       ├── api.ts               # API service functions
│       └── admin-api.ts         # Admin API functions
│
└── docs/                        # Architecture documentation
```

## Game Categories (100 Games)

| Category | Games | Examples |
|----------|-------|---------|
| Arcade | 15 | Snake, Tetris, Pacman, Breakout, Space Invaders |
| Cards | 12 | Solitaire, Blackjack, Card Flip, Go Fish |
| Dice | 8 | Yahtzee, Farkle, Dice Duel |
| Wheel | 5 | Lucky Wheel, Prize Wheel, Color Wheel |
| Puzzle | 15 | 2048, Sudoku, Hangman, Crossword, Sokoban |
| Reaction | 8 | Simon Says, Color Match, Speed Click |
| Strategy | 10 | Chess Puzzle, Checkers, Othello, Battleship |
| Memory | 8 | Memory Match, Number Memory, Pattern Memory |
| Number | 10 | Number Guess, Math Challenge, Higher or Lower |
| Casual | 9 | Typing Speed, Trivia Quiz, Word Scramble |

## API Endpoints

### Public
- `GET /api/v1/ping` — Health check

### Auth
- `POST /api/v1/register` — Register new user
- `POST /api/v1/login` — Login
- `POST /api/v1/logout` — Logout (auth required)
- `GET /api/v1/me` — Current user (auth required)

### Games
- `GET /api/v1/games` — List all games (paginated)
- `GET /api/v1/games/featured` — Featured games
- `GET /api/v1/games/{id}` — Game by ID
- `GET /api/v1/games/by-slug/{slug}` — Game by slug
- `GET /api/v1/categories` — List categories

### Demo Credits (auth required)
- `GET /api/v1/demo-credits/balance` — Get balance
- `POST /api/v1/demo-credits/daily-bonus` — Claim daily bonus
- `GET /api/v1/demo-credits/stats` — User stats

### Scores (auth required)
- `POST /api/v1/game-scores` — Submit score
- `GET /api/v1/game-scores/history` — Score history
- `GET /api/v1/game-scores/leaderboard` — Global leaderboard

### Admin (auth + admin role required)
- `GET /api/v1/admin/stats` — Dashboard stats
- CRUD for games and categories

## License

MIT
