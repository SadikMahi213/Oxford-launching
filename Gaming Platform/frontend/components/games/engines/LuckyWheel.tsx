"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover";

const SEGMENTS = 12;
const SEGMENT_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F43F5E", "#06B6D4", "#A855F7", "#84CC16"];
const SEGMENT_POINTS = [100, 50, 200, 75, 300, 25, 150, 10, 400, 60, 250, 5];

export default function LuckyWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [spins, setSpins] = useState(10);
  const [highScore, setHighScore] = useState(0);
  const [message, setMessage] = useState("");

  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const spinningRef = useRef(false);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = 200;
    const cy = 200;
    const r = 160;

    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 400, 400);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current);

    for (let i = 0; i < SEGMENTS; i++) {
      const startAngle = (Math.PI * 2 / SEGMENTS) * i;
      const endAngle = startAngle + Math.PI * 2 / SEGMENTS;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + Math.PI / SEGMENTS);
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${SEGMENT_POINTS[i]}`, r * 0.65, 5);
      ctx.restore();
    }

    ctx.restore();

    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 15);
    ctx.lineTo(cx - 10, cy - r - 30);
    ctx.lineTo(cx + 10, cy - r - 30);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#333";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO", cx, cy + 5);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 25);
    ctx.textAlign = "right";
    ctx.fillText(`Spins: ${spinsRef.current}`, 390, 25);
  }, []);

  const scoreRef = useRef(0);
  const spinsRef = useRef(10);

  useEffect(() => {
    scoreRef.current = score;
    spinsRef.current = spins;
    draw();
  }, [score, spins, draw]);

  const spin = useCallback(() => {
    if (spinningRef.current || spins <= 0) return;
    spinningRef.current = true;
    setSpins((s) => s - 1);

    speedRef.current = 0.3 + Math.random() * 0.2;

    const animate = () => {
      angleRef.current += speedRef.current;
      speedRef.current *= 0.985;

      if (speedRef.current < 0.001) {
        spinningRef.current = false;

        const normalizedAngle = ((angleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const segmentAngle = Math.PI * 2 / SEGMENTS;
        const pointerAngle = (Math.PI * 2 - normalizedAngle + Math.PI / 2) % (Math.PI * 2);
        const segmentIdx = Math.floor(pointerAngle / segmentAngle) % SEGMENTS;
        const points = SEGMENT_POINTS[segmentIdx];

        setScore((s) => {
          const ns = s + points;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
        setMessage(`+${points} points!`);

        if (spinsRef.current <= 0) {
          setTimeout(() => setGameState("gameover"), 1000);
        }
        draw();
        return;
      }

      draw();
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, [spins, highScore, draw]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const startGame = useCallback(() => {
    angleRef.current = 0;
    speedRef.current = 0;
    spinningRef.current = false;
    setScore(0);
    setSpins(10);
    setMessage("");
    setGameState("playing");
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Lucky Wheel</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Spins: <span className="text-blue-400 font-bold">{spins}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {message && <p className="text-yellow-400 text-lg font-bold">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Spin the wheel 10 times to earn points!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState !== "idle" && (
        <canvas ref={canvasRef} width={400} height={400} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}

      {gameState === "playing" && (
        <button onClick={spin} disabled={spinningRef.current || spins <= 0} className="px-8 py-4 bg-yellow-600 text-white rounded-lg font-bold text-xl hover:bg-yellow-500 transition disabled:opacity-50">
          {spinningRef.current ? "Spinning..." : spins <= 0 ? "No Spins Left" : "SPIN!"}
        </button>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
