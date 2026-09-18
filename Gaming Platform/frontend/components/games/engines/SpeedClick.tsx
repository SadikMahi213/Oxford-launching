"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";
type Target = { id: number; x: number; y: number; size: number; color: string; spawnTime: number };

const TARGET_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];

export default function SpeedClick() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timer, setTimer] = useState(30);
  const [highScore, setHighScore] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const targetsRef = useRef<Target[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const timerSecondsRef = useRef(30);

  const spawnTarget = useCallback((canvas: HTMLCanvasElement) => {
    const size = 30 + Math.random() * 30;
    const target: Target = {
      id: Date.now() + Math.random(),
      x: size + Math.random() * (canvas.width - size * 2),
      y: size + Math.random() * (canvas.height - size * 2),
      size,
      color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
      spawnTime: Date.now(),
    };
    targetsRef.current.push(target);
    setTargetCount((c) => c + 1);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1F2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    targetsRef.current = targetsRef.current.filter((t) => now - t.spawnTime < 2000);

    targetsRef.current.forEach((target) => {
      const age = (now - target.spawnTime) / 2000;
      const alpha = 1 - age;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.size, 0, Math.PI * 2);
      ctx.fillStyle = target.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+10", target.x, target.y);
    });

    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 25);
    ctx.fillText(`Misses: ${missesRef.current}`, 10, 45);

    if (timerSecondsRef.current > 0) {
      ctx.textAlign = "right";
      ctx.fillText(`Time: ${timerSecondsRef.current}s`, canvas.width - 10, 25);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    targetsRef.current = [];
    scoreRef.current = 0;
    missesRef.current = 0;
    timerSecondsRef.current = 30;
    setScore(0);
    setMisses(0);
    setTimer(30);
    setTargetCount(0);
    setGameState("playing");

    spawnTarget(canvas);
    const spawnInterval = setInterval(() => {
      if (canvas) spawnTarget(canvas);
    }, 800);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      timerSecondsRef.current -= 1;
      setTimer(timerSecondsRef.current);
      if (timerSecondsRef.current <= 0) {
        clearInterval(timerRef.current!);
        clearInterval(spawnInterval);
        cancelAnimationFrame(animRef.current);
        setGameState("gameover");
        if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      }
    }, 1000);

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [spawnTarget, draw, highScore]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hit = false;
    targetsRef.current = targetsRef.current.filter((t) => {
      const dist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
      if (dist < t.size) {
        hit = true;
        scoreRef.current += 10;
        setScore(scoreRef.current);
        return false;
      }
      return true;
    });

    if (!hit) {
      missesRef.current += 1;
      setMisses(missesRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Speed Clicker</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Misses: <span className="text-red-400 font-bold">{misses}</span></span>
        <span className="text-gray-400">Time: <span className="text-blue-400 font-bold">{timer}s</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Click the targets before they disappear! Each target is worth 10 points.
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full max-w-lg aspect-[4/3] rounded-xl border border-gray-700 ${
          gameState === "playing" ? "cursor-crosshair" : "cursor-default"
        }`}
        style={{ display: gameState === "idle" ? "none" : "block" }}
      />

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">Time&apos;s Up!</p>
            <p className="text-4xl font-bold text-green-400 mt-2">{score} points</p>
            <p className="text-gray-400 mt-1">Targets hit: {Math.floor(score / 10)} | Misses: {misses}</p>
            {score > 0 && (
              <p className="text-blue-400 text-sm mt-1">
                Accuracy: {Math.round((score / 10) / ((score / 10) + misses) * 100)}%
              </p>
            )}
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
