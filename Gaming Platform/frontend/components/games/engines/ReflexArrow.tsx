"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function ReflexArrow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const arrowDirRef = useRef<"UP" | "DOWN" | "LEFT" | "RIGHT">("UP");
  const startTimeRef = useRef(0);
  const animRef = useRef<number>(0);

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, dir: string, x: number, y: number, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    switch (dir) {
      case "UP":
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size * 0.7, y + size * 0.5);
        ctx.lineTo(x + size * 0.7, y + size * 0.5);
        break;
      case "DOWN":
        ctx.moveTo(x, y + size);
        ctx.lineTo(x - size * 0.7, y - size * 0.5);
        ctx.lineTo(x + size * 0.7, y - size * 0.5);
        break;
      case "LEFT":
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size * 0.5, y - size * 0.7);
        ctx.lineTo(x + size * 0.5, y + size * 0.7);
        break;
      case "RIGHT":
        ctx.moveTo(x + size, y);
        ctx.lineTo(x - size * 0.5, y - size * 0.7);
        ctx.lineTo(x - size * 0.5, y + size * 0.7);
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${score} | Best: ${highScore}ms`, canvas.width / 2, 25);

    const dirs: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    const arrowSize = 40;
    const positions = [
      { x: canvas.width / 2, y: canvas.height / 2 - 60 },
      { x: canvas.width / 2, y: canvas.height / 2 + 60 },
      { x: canvas.width / 2 - 60, y: canvas.height / 2 },
      { x: canvas.width / 2 + 60, y: canvas.height / 2 },
    ];

    dirs.forEach((dir, i) => {
      const isTarget = dir === arrowDirRef.current && gameState === "playing";
      drawArrow(ctx, dir, positions[i].x, positions[i].y, arrowSize, isTarget ? "#22C55E" : "#334155");
    });

    if (gameState === "playing") {
      const elapsed = Date.now() - startTimeRef.current;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${elapsed}ms`, canvas.width / 2, canvas.height / 2);
    }

    if (gameState === "gameover") {
      ctx.fillStyle = "#EF4444";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Wrong direction!", canvas.width / 2, canvas.height / 2);
    }
  }, [score, highScore, gameState, drawArrow]);

  const gameLoop = useCallback(() => {
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  const showArrow = useCallback(() => {
    const dirs: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    arrowDirRef.current = dirs[Math.floor(Math.random() * 4)];
    startTimeRef.current = Date.now();
    setGameState("playing");
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setReactionTime(0);
    setDisplayTime(0);
    setTimeout(() => showArrow(), 500 + Math.random() * 1500);
  }, [showArrow]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleDirection = useCallback((dir: string) => {
    if (gameState !== "playing") return;

    const elapsed = Date.now() - startTimeRef.current;
    setDisplayTime(elapsed);

    if (dir === arrowDirRef.current) {
      setScore(s => s + 1);
      const newReactionTime = reactionTime ? (reactionTime + elapsed) / 2 : elapsed;
      setReactionTime(Math.round(newReactionTime));
      if (elapsed < highScore || highScore === 0) setHighScore(Math.round(elapsed));
      setTimeout(() => showArrow(), 300 + Math.random() * 1000);
    } else {
      setGameState("gameover");
    }
  }, [gameState, reactionTime, highScore, showArrow]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp": case "w": handleDirection("UP"); break;
        case "ArrowDown": case "s": handleDirection("DOWN"); break;
        case "ArrowLeft": case "a": handleDirection("LEFT"); break;
        case "ArrowRight": case "d": handleDirection("RIGHT"); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleDirection, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Reflex Arrow</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Avg: <span className="text-blue-400 font-bold">{reactionTime}ms</span></span>
        <span className="text-gray-400">Last: <span className="text-yellow-400 font-bold">{displayTime}ms</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Press the matching arrow key as fast as you can!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Direction!</p>
              <p className="text-3xl font-bold text-white">Score: {score}</p>
              <p className="text-gray-300">Avg: {reactionTime}ms</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
