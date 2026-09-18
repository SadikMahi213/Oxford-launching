"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Play, RotateCcw, Trophy } from "lucide-react";

import { Game, GameState, GameEngine as IGameEngine } from "@/lib/games/types";
import { gameRegistry } from "@/lib/games/GameRegistry";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GamePlayerProps {
  game: Game;
}

function getHighScoreKey(slug: string): string {
  return `highScore_${slug}`;
}

function loadHighScore(slug: string): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(getHighScoreKey(slug));
  return stored ? parseInt(stored, 10) || 0 : 0;
}

function saveHighScore(slug: string, score: number): void {
  if (typeof window === "undefined") return;
  const current = loadHighScore(slug);
  if (score > current) {
    localStorage.setItem(getHighScoreKey(slug), score.toString());
  }
}

export function GamePlayer({ game }: GamePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IGameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    status: "idle",
    score: 0,
    highScore: loadHighScore(game.slug),
    level: 1,
    duration: 0,
  });
  const [showRules, setShowRules] = useState(false);

  const handleScoreChange = useCallback((score: number) => {
    setGameState((prev) => {
      const newHighScore = Math.max(score, prev.highScore);
      saveHighScore(game.slug, score);
      return { ...prev, score, highScore: newHighScore };
    });
  }, [game.slug]);

  const handleGameStateChange = useCallback((state: GameState) => {
    setGameState((prev) => ({ ...prev, ...state }));
  }, []);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  const initializeEngine = useCallback(() => {
    if (!canvasRef.current) return null;

    if (!gameRegistry.has(game.game_slug)) {
      return null;
    }

    const engine = gameRegistry.get(game.game_slug);
    if (!engine) return null;

    engine.onScoreChange = handleScoreChange;
    engine.onGameStateChange = handleGameStateChange;
    engine.initialize(canvasRef.current, game.config);

    return engine;
  }, [game.game_slug, game.config, handleScoreChange, handleGameStateChange]);

  const handleStart = () => {
    if (!engineRef.current) {
      engineRef.current = initializeEngine();
    }
    if (engineRef.current) {
      engineRef.current.start();
      setGameState((prev) => ({ ...prev, status: "playing" }));
    }
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setGameState((prev) => ({ ...prev, status: "playing" }));
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
      setGameState((prev) => ({
        ...prev,
        status: "playing",
        score: 0,
        level: 1,
        duration: 0,
      }));
    }
  };

  const isIdle = gameState.status === "idle";
  const isPlaying = gameState.status === "playing";
  const isPaused = gameState.status === "paused";
  const isGameOver = gameState.status === "gameover";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/games">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{game.name}</h1>
          <p className="text-sm text-muted-foreground">{game.description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRules(!showRules)}
        >
          Rules
        </Button>
      </div>

      {showRules && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How to Play</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {game.rules}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameState.score}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Trophy className="h-3 w-3" /> High Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameState.highScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameState.level}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative rounded-lg border bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full h-auto block"
        />

        {isIdle && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Button size="lg" onClick={handleStart}>
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-4">
            <h2 className="text-3xl font-bold text-white">Game Over</h2>
            <p className="text-xl text-white">Score: {gameState.score}</p>
            {gameState.score >= gameState.highScore && gameState.score > 0 && (
              <p className="text-lg text-yellow-400">New High Score!</p>
            )}
            <Button size="lg" onClick={handleRestart}>
              <RotateCcw className="h-5 w-5 mr-2" />
              Play Again
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {!isIdle && !isGameOver && (
          <>
            {isPlaying ? (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : isPaused ? (
              <Button onClick={handleResume}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Demo Credits - No Monetary Value
      </p>
    </div>
  );
}
