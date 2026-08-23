"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Target = { x: number; y: number; radius: number; color: string; spawnTime: number };

export default function TargetClick() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [accuracy, setAccuracy] = useState(100);
  const targetsRef = useRef<Target[]>([]);
  const clicksRef = useRef(0);
  const hitsRef = useRef(0);
  const animRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  const spawnTarget = useCallback(() => {
    const radius = 15 + Math.random() * 20;
    const colors = ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7"];
    targetsRef.current.push({
      x: radius + Math.random() * (480 - radius * 2),
      y: 50 + radius + Math.random() * (340 - radius * 2),
      radius,
      color: colors[Math.floor(Math.random() * colors.length)],
      spawnTime: Date.now(),
    });
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
    ctx.fillText(`Score: ${score} | Time: ${timeLeft}s | Accuracy: ${accuracy}%`, canvas.width / 2, 25);

    const now = Date.now();
    targetsRef.current = targetsRef.current.filter(t => now - t.spawnTime < 2000);

    targetsRef.current.forEach(target => {
      const age = (now - target.spawnTime) / 2000;
      const fadeOut = 1 - age;
      const scale = 0.5 + age * 0.5;

      ctx.globalAlpha = fadeOut;
      ctx.fillStyle = target.color;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${target.radius * 0.6}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("10", target.x, target.y);

      ctx.globalAlpha = 1;
    });
  }, [score, timeLeft, accuracy]);

  const gameLoop = useCallback(() => {
    if (Math.random() < 0.08) {
      spawnTarget();
    }
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, spawnTarget]);

  const startGame = useCallback(() => {
    targetsRef.current = [];
    clicksRef.current = 0;
    hitsRef.current = 0;
    setScore(0);
    setTimeLeft(30);
    setAccuracy(100);
    setGameState("playing");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState("gameover");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === "gameover") {
      cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (score > highScore) setHighScore(score);
    }
  }, [gameState, score, highScore]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    clicksRef.current++;
    let hit = false;

    for (let i = targetsRef.current.length - 1; i >= 0; i--) {
      const target = targetsRef.current[i];
      const dist = Math.sqrt((clickX - target.x) ** 2 + (clickY - target.y) ** 2);
      if (dist <= target.radius) {
        targetsRef.current.splice(i, 1);
        hitsRef.current++;
        setScore(s => s + 10);
        hit = true;
        break;
      }
    }

    if (clicksRef.current > 0) {
      setAccuracy(Math.round((hitsRef.current / clicksRef.current) * 100));
    }
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        if (gameState === "idle" || gameState === "gameover") {
          e.preventDefault();
          startGame();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Target Click</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Time: <span className="text-yellow-400 font-bold">{timeLeft}s</span></span>
        <span className="text-gray-400">Accuracy: <span className="text-blue-400 font-bold">{accuracy}%</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={400}
          className="rounded-lg border border-gray-700 cursor-crosshair max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Click the targets before they disappear!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Time's Up!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <p className="text-gray-300">Accuracy: {accuracy}%</p>
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
