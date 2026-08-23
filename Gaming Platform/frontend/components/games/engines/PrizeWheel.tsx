"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "spinning" | "gameover";

const PRIZES = [
  { label: "$100", value: 100, color: "#EF4444" },
  { label: "$250", value: 250, color: "#F97316" },
  { label: "$500", value: 500, color: "#EAB308" },
  { label: "$750", value: 750, color: "#22C55E" },
  { label: "$1000", value: 1000, color: "#3B82F6" },
  { label: "$2000", value: 2000, color: "#8B5CF6" },
  { label: "JACKPOT", value: 5000, color: "#EC4899" },
  { label: "TRY AGAIN", value: 0, color: "#6B7280" },
  { label: "$150", value: 150, color: "#14B8A6" },
  { label: "$350", value: 350, color: "#F43F5E" },
];

export default function PrizeWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [spins, setSpins] = useState(0);
  const [maxSpins] = useState(5);
  const [lastPrize, setLastPrize] = useState<string>("");
  const [history, setHistory] = useState<{ label: string; value: number }[]>([]);

  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const animRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current * (Math.PI / 180));

    PRIZES.forEach((prize, i) => {
      const startA = (i / PRIZES.length) * Math.PI * 2;
      const endA = ((i + 1) / PRIZES.length) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startA + (endA - startA) / 2);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(prize.label, r * 0.6, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#1F2937";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 5);
    ctx.lineTo(cx - 12, cy - r - 25);
    ctx.lineTo(cx + 12, cy - r - 25);
    ctx.closePath();
    ctx.fill();
  }, []);

  const spin = useCallback(() => {
    if (gameState !== "idle" || spins >= maxSpins) return;
    setGameState("spinning");
    speedRef.current = 18 + Math.random() * 15;

    const animate = () => {
      speedRef.current *= 0.988;
      angleRef.current = (angleRef.current + speedRef.current) % 360;
      draw();

      if (speedRef.current > 0.2) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const normalized = (360 - (angleRef.current % 360)) % 360;
        const idx = Math.floor((normalized / 360) * PRIZES.length) % PRIZES.length;
        const prize = PRIZES[idx];

        setLastPrize(prize.label);
        setTotalWinnings((t) => t + prize.value);
        setSpins((s) => s + 1);
        setHistory((h) => [...h, { label: prize.label, value: prize.value }]);
        setGameState("idle");
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [gameState, spins, maxSpins, draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && gameState === "idle") {
        e.preventDefault();
        spin();
      }
      if (e.key === "r" || e.key === "R") {
        setTotalWinnings(0);
        setSpins(0);
        setLastPrize("");
        setHistory([]);
        setGameState("idle");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, spin]);

  useEffect(() => {
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const gameOver = spins >= maxSpins;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Prize Wheel</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Total: ${totalWinnings.toLocaleString()}</span>
        <span className="text-gray-400">Spins: {spins}/{maxSpins}</span>
      </div>
      <canvas ref={canvasRef} width={300} height={300} className="rounded-lg" />

      {lastPrize && (
        <div className={`text-lg font-bold ${lastPrize === "TRY AGAIN" ? "text-red-400" : "text-green-400"}`}>
          {lastPrize === "TRY AGAIN" ? "Try Again!" : `Won ${lastPrize}!`}
        </div>
      )}

      {!gameOver ? (
        <button
          onClick={spin}
          disabled={gameState === "spinning"}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold text-lg disabled:opacity-50"
        >
          {gameState === "spinning" ? "Spinning..." : "Spin! (Space)"}
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl text-yellow-400 font-bold">Game Over!</p>
          <p className="text-white">Total Winnings: ${totalWinnings.toLocaleString()}</p>
          <button
            onClick={() => { setTotalWinnings(0); setSpins(0); setLastPrize(""); setHistory([]); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2"
          >
            Reset & Play Again
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-gray-400 text-sm mb-1">History:</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span key={i} className={`text-xs px-2 py-1 rounded ${h.value > 0 ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`}>
                {h.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {gameState === "idle" && spins === 0 && (
        <p className="text-gray-400 text-sm text-center">Spin the wheel to win prizes! Press Space to spin.</p>
      )}
    </div>
  );
}
