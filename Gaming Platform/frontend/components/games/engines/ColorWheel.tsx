"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "betting" | "spinning" | "result";

const COLORS = [
  { name: "Red", color: "#EF4444", multiplier: 2, chance: 0.4 },
  { name: "Black", color: "#1F2937", multiplier: 2, chance: 0.4 },
  { name: "Green", color: "#22C55E", multiplier: 14, chance: 0.1 },
  { name: "Gold", color: "#EAB308", multiplier: 7, chance: 0.1 },
];

export default function ColorWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(50);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [resultColor, setResultColor] = useState<string>("");
  const [winnings, setWinnings] = useState(0);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const wheelSegments = useRef<{ color: string; label: string }[]>([]);

  const initSegments = useCallback(() => {
    const segs: { color: string; label: string }[] = [];
    for (let i = 0; i < 8; i++) segs.push({ color: "#EF4444", label: "Red" });
    for (let i = 0; i < 8; i++) segs.push({ color: "#1F2937", label: "Black" });
    segs.push({ color: "#22C55E", label: "Green" });
    segs.push({ color: "#EAB308", label: "Gold" });
    for (let i = segs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [segs[i], segs[j]] = [segs[j], segs[i]];
    }
    wheelSegments.current = segs;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 10;
    const segs = wheelSegments.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (segs.length === 0) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current * (Math.PI / 180));

    segs.forEach((seg, i) => {
      const startA = (i / segs.length) * Math.PI * 2;
      const endA = ((i + 1) / segs.length) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "#D1D5DB";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 5);
    ctx.lineTo(cx - 8, cy - r - 20);
    ctx.lineTo(cx + 8, cy - r - 20);
    ctx.closePath();
    ctx.fill();
  }, []);

  const spin = useCallback(() => {
    if (gameState !== "betting" || bet > balance || bet <= 0 || !selectedColor) return;
    setGameState("spinning");
    setMessage("");

    const segs = wheelSegments.current;
    if (segs.length === 0) return;

    speedRef.current = 15 + Math.random() * 12;

    const animate = () => {
      speedRef.current *= 0.987;
      angleRef.current = (angleRef.current + speedRef.current) % 360;
      draw();

      if (speedRef.current > 0.2) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const normalized = (360 - (angleRef.current % 360)) % 360;
        const idx = Math.floor((normalized / 360) * segs.length) % segs.length;
        const result = segs[idx];
        setResultColor(result.label);
        setHistory((h) => [...h.slice(-19), result.label]);

        const colorData = COLORS.find((c) => c.name === selectedColor);
        if (selectedColor === result.label && colorData) {
          const winAmount = bet * colorData.multiplier;
          setBalance((b) => b + winAmount - bet);
          setWinnings(winAmount);
          setMessage(`You won $${winAmount}!`);
        } else {
          setBalance((b) => b - bet);
          setWinnings(0);
          setMessage(`${result.label}! You lost $${bet}.`);
        }

        setGameState("result");
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [gameState, bet, balance, selectedColor, draw]);

  useEffect(() => {
    initSegments();
  }, [initSegments]);

  useEffect(() => {
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "1") setSelectedColor("Red");
      if (e.key === "2") setSelectedColor("Black");
      if (e.key === "3") setSelectedColor("Green");
      if (e.key === "4") setSelectedColor("Gold");
      if ((e.key === " " || e.key === "Enter") && gameState === "betting") {
        e.preventDefault();
        spin();
      }
      if ((e.key === " " || e.key === "Enter") && gameState === "result") {
        e.preventDefault();
        setGameState("betting");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, spin]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Color Wheel</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Balance: ${balance}</span>
        {winnings > 0 && <span className="text-green-400">Won: ${winnings}</span>}
      </div>
      <canvas ref={canvasRef} width={280} height={280} className="rounded-lg" />

      {gameState === "betting" && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {COLORS.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c.name)}
                className={`px-3 py-2 rounded font-bold text-sm text-white ${selectedColor === c.name ? "ring-2 ring-white" : ""}`}
                style={{ backgroundColor: c.color }}
              >
                {c.name} ({c.multiplier}x)
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Bet:</span>
            {[10, 25, 50, 100, 250].map((b) => (
              <button
                key={b}
                onClick={() => setBet(b)}
                className={`px-2 py-1 rounded text-sm ${bet === b ? "bg-white text-black" : "bg-gray-700 text-white"}`}
              >
                ${b}
              </button>
            ))}
          </div>
          <button
            onClick={spin}
            disabled={!selectedColor || bet > balance}
            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold text-lg disabled:opacity-50"
          >
            Spin (Space)
          </button>
        </div>
      )}

      {gameState === "result" && (
        <div className="text-center">
          <p className={`text-lg font-bold ${winnings > 0 ? "text-green-400" : "text-red-400"}`}>{message}</p>
          <button onClick={() => setGameState("betting")} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Continue</button>
        </div>
      )}

      {gameState === "spinning" && <p className="text-gray-400">Spinning...</p>}

      {balance <= 0 && (
        <div className="text-center">
          <p className="text-red-400 font-bold">Out of money!</p>
          <button onClick={() => { setBalance(1000); setGameState("betting"); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Reset Balance</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex gap-1">
          {history.slice(-10).map((h, i) => (
            <span key={i} className="w-6 h-6 rounded-full text-xs flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: h === "Red" ? "#EF4444" : h === "Black" ? "#374151" : h === "Green" ? "#22C55E" : "#EAB308" }}>
              {h[0]}
            </span>
          ))}
        </div>
      )}

      {gameState === "idle" && (
        <button onClick={() => setGameState("betting")} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Playing</button>
      )}
    </div>
  );
}
