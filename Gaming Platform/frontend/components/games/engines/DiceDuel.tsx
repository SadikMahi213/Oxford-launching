"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover";

interface Dice { value: number; held: boolean; rolling: boolean; }

function createDice(): Dice[] {
  return Array.from({ length: 5 }, () => ({ value: Math.ceil(Math.random() * 6), held: false, rolling: false }));
}

function renderDie(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, value: number, held: boolean) {
  ctx.fillStyle = held ? "#FBBF24" : "#FFF";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = held ? "#F59E0B" : "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);

  const cx = x + size / 2;
  const cy = y + size / 2;
  const dotR = size * 0.08;
  ctx.fillStyle = "#111";

  const dots: [number, number][] = [];
  if (value === 1 || value === 3 || value === 5) dots.push([cx, cy]);
  if (value >= 2) { dots.push([x + size * 0.25, y + size * 0.25]); dots.push([x + size * 0.75, y + size * 0.75]); }
  if (value >= 4) { dots.push([x + size * 0.75, y + size * 0.25]); dots.push([x + size * 0.25, y + size * 0.75]); }
  if (value === 6) { dots.push([x + size * 0.25, cy]); dots.push([x + size * 0.75, cy]); }

  dots.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fill();
  });
}

export default function DiceDuel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerDice, setPlayerDice] = useState<Dice[]>(createDice());
  const [cpuDice, setCpuDice] = useState<Dice[]>(createDice());
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [message, setMessage] = useState("");
  const [rolling, setRolling] = useState(false);

  const drawDice = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 400, 300);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("YOUR DICE", 100, 30);
    ctx.fillStyle = "#EF4444";
    ctx.fillText("CPU DICE", 300, 30);

    playerDice.forEach((d, i) => {
      renderDie(ctx, 30 + i * 60, 50, 50, d.value, d.held);
    });

    cpuDice.forEach((d, i) => {
      renderDie(ctx, 190 + i * 60, 50, 50, d.value, d.held);
    });

    const pTotal = playerDice.reduce((s, d) => s + d.value, 0);
    const cTotal = cpuDice.reduce((s, d) => s + d.value, 0);

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`Total: ${pTotal}`, 100, 140);
    ctx.fillText(`Total: ${cTotal}`, 300, 140);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#9CA3AF";
    ctx.fillText(`Rounds: ${rounds} | You: ${playerScore} | CPU: ${cpuScore}`, 200, 180);

    if (message) {
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = message.includes("You") ? "#22C55E" : message.includes("CPU") ? "#EF4444" : "#FBBF24";
      ctx.fillText(message, 200, 220);
    }

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#6B7280";
    ctx.fillText("Click dice to hold/unhold, then roll!", 200, 260);
    ctx.fillText("Click held dice = keep, click rolling = set", 200, 280);
  }, [playerDice, cpuDice, playerScore, cpuScore, rounds, message]);

  useEffect(() => { drawDice(); }, [drawDice]);

  const rollDice = useCallback(() => {
    if (rolling) return;
    setRolling(true);

    const newPlayer = playerDice.map((d) => d.held ? d : { ...d, value: Math.ceil(Math.random() * 6), rolling: true });
    const newCpu = cpuDice.map((d) => ({ ...d, value: Math.ceil(Math.random() * 6) }));

    setPlayerDice(newPlayer);
    setCpuDice(newCpu);

    setTimeout(() => {
      setPlayerDice((prev) => prev.map((d) => ({ ...d, rolling: false })));
      const pTotal = newPlayer.reduce((s, d) => s + d.value, 0);
      const cTotal = newCpu.reduce((s, d) => s + d.value, 0);

      if (pTotal > cTotal) {
        setPlayerScore((s) => s + 1);
        setMessage("You Win the Round!");
      } else if (cTotal > pTotal) {
        setCpuScore((s) => s + 1);
        setMessage("CPU Wins the Round!");
      } else {
        setMessage("It's a Tie!");
      }
      setRounds((r) => r + 1);
      setRolling(false);

      setTimeout(() => setMessage(""), 1500);
    }, 800);
  }, [playerDice, cpuDice, rolling]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || rolling) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (400 / rect.width);
    const my = (e.clientY - rect.top) * (300 / rect.height);

    if (my >= 50 && my <= 100) {
      for (let i = 0; i < 5; i++) {
        const x = 30 + i * 60;
        if (mx >= x && mx <= x + 50) {
          setPlayerDice((prev) => prev.map((d, idx) => idx === i ? { ...d, held: !d.held } : d));
          break;
        }
      }
    }
  }, [gameState, rolling]);

  const startGame = useCallback(() => {
    setPlayerDice(createDice());
    setCpuDice(createDice());
    setPlayerScore(0);
    setCpuScore(0);
    setRounds(0);
    setMessage("");
    setGameState("playing");
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Dice Duel</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Rounds: <span className="text-blue-400 font-bold">{rounds}</span></span>
        <span className="text-gray-400">You: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU: <span className="text-red-400 font-bold">{cpuScore}</span></span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll higher than the CPU! Hold dice to keep values.</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <canvas ref={canvasRef} width={400} height={300} onClick={handleClick} className="rounded-lg border border-gray-700 cursor-pointer" style={{ maxWidth: "100%" }} />
          <div className="flex gap-4">
            <button onClick={rollDice} disabled={rolling} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50">
              {rolling ? "Rolling..." : "Roll Dice"}
            </button>
          </div>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">{playerScore > cpuScore ? "You Win!" : "CPU Wins!"}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
