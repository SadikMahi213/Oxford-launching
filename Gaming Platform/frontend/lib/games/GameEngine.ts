import { GameState, GameConfig, GameEngine as IGameEngine } from './types';

export abstract class BaseGameEngine implements IGameEngine {
  protected canvas: HTMLCanvasElement | null = null;
  protected ctx: CanvasRenderingContext2D | null = null;
  protected state: GameState = {
    status: 'idle',
    score: 0,
    highScore: 0,
    level: 1,
    duration: 0,
  };
  protected config: GameConfig = {};
  protected animationFrame: number | null = null;
  protected timerInterval: ReturnType<typeof setInterval> | null = null;

  onScoreChange?: (score: number) => void;
  onGameStateChange?: (state: GameState) => void;

  abstract initialize(canvas: HTMLCanvasElement, config: GameConfig): void;
  abstract start(): void;
  abstract restart(): void;

  pause(): void {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.onGameStateChange?.(this.state);
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
      this.onGameStateChange?.(this.state);
    }
  }

  finish(): void {
    this.state.status = 'gameover';
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.onGameStateChange?.(this.state);
  }

  destroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.canvas = null;
    this.ctx = null;
  }

  protected updateScore(score: number): void {
    this.state.score = score;
    this.onScoreChange?.(score);
  }

  protected getState(): GameState {
    return { ...this.state };
  }
}
