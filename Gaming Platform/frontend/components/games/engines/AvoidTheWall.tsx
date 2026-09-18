"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Wall = { x: number; gapY: number; gapSize: number; passed: boolean };

export default function AvoidTheWall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const playerRef = useRef({ x: 80, y: 200, vy: 0 });
  const wallsRef = useRef<Wall[]>([]);
  const animRef = useRef<number>(0);
  const lastWallRef = useRef(0);
  const speedRef = useRef(2);
  const gravityRef = useRef(0.4);

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
    ctx.fillText(`Score: ${score} | High: ${highScore}`, canvas.width / 2, 25);

    wallsRef.current.forEach(wall => {
      const wallWidth = 40;
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(wall.x, 0, wallWidth, wall.gapY);
      ctx.fillRect(wall.x, wall.gapY + wall.gapSize, wallWidth, canvas.height - wall.gapY - wall.gapSize);

      ctx.strokeStyle = "#15803D";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, 0, wallWidth, wall.gapY);
      ctx.strokeRect(wall.x, wall.gapY + wall.gapSize, wallWidth, canvas.height - wall.gapY - wall.gapSize);
    });

    const player = playerRef.current;
    ctx.fillStyle = "#3B82F6";
    ctx.beginPath();
    ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#60A5FA";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [score, highScore]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const player = playerRef.current;
    player.vy += gravityRef.current;
    player.y += player.vy;

    if (player.y < 15) { player.y = 15; player.vy = 0; }
    if (player.y > canvas.height - 15) { player.y = canvas.height - 15; player.vy = 0; }

    const now = Date.now();
    if (now - lastWallRef.current > 1800) {
      const gapSize = Math.max(100, 160 - score * 2);
      wallsRef.current.push({
        x: canvas.width + 40,
        gapY: 60 + Math.random() * (canvas.height - gapSize - 120),
        gapSize,
        passed: false,
      });
      lastWallRef.current = now;
    }

    wallsRef.current.forEach(wall => {
      wall.x -= speedRef.current;
      if (!wall.passed && wall.x + 40 < player.x) {
        wall.passed = true;
        setScore(s => s + 1);
      }
    });

    wallsRef.current = wallsRef.current.filter(w => w.x > -50);

    for (const wall of wallsRef.current) {
      if (
        player.x + 15 > wall.x && player.x - 15 < wall.x + 40 &&
        (player.y - 15 < wall.gapY || player.y + 15 > wall.gapY + wall.gapSize)
      ) {
        setGameState("gameover");
        setScore(s => {
          if (s > highScore) setHighScore(s);
          return s;
        });
        return;
      }
    }

    speedRef.current = 2 + score * 0.05;

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, highScore]);

  const startGame = useCallback(() => {
    playerRef.current = { x: 80, y: 200, vy: 0 };
    wallsRef.current = [];
    lastWallRef.current = 0;
    speedRef.current = 2;
    gravityRef.current = 0.4;
    setScore(0);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, gameLoop]);

  const handleFlap = useCallback(() => {
    if (gameState === "playing") {
      playerRef.current.vy = -7;
    }
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        if (gameState === "idle" || gameState === "gameover") {
          e.preventDefault();
          startGame();
        } else if (gameState === "playing") {
          e.preventDefault();
          handleFlap();
        }
      }
      if (e.key === "ArrowUp" || e.key === "w") {
        if (gameState === "playing") handleFlap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleFlap]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Avoid The Wall</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={400}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleFlap}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Space/Click to flap, avoid the walls!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Crashed!</p>
              <p className="text-3xl font-bold text-white">{score}</p>
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
