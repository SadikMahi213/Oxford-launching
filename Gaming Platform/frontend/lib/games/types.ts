export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'gameover';
  score: number;
  highScore: number;
  level: number;
  duration: number;
}

export interface GameConfig {
  [key: string]: any;
}

export interface Game {
  id: number;
  name: string;
  slug: string;
  game_slug: string;
  description: string;
  category: { name: string; slug: string; icon: string };
  difficulty: 'easy' | 'medium' | 'hard';
  is_featured: boolean;
  thumbnail_url: string;
  banner_url: string;
  rules: string;
  config: GameConfig;
  play_count: number;
  max_score: number;
}

export interface GameEngine {
  initialize: (canvas: HTMLCanvasElement, config: GameConfig) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  finish: () => void;
  destroy: () => void;
  onScoreChange?: (score: number) => void;
  onGameStateChange?: (state: GameState) => void;
}
