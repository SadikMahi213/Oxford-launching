import { GameEngine, GameConfig } from './types';

type GameFactory = () => GameEngine;

class GameRegistry {
  private games: Map<string, GameFactory> = new Map();

  register(slug: string, factory: GameFactory): void {
    this.games.set(slug, factory);
  }

  get(slug: string): GameEngine | null {
    const factory = this.games.get(slug);
    return factory ? factory() : null;
  }

  has(slug: string): boolean {
    return this.games.has(slug);
  }
}

export const gameRegistry = new GameRegistry();
