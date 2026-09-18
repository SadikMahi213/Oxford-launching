"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";

export default function PatternMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<boolean[]>([]);
  const [playerPattern, setPlayerPattern] = useState<boolean[]>([]);
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const GRID = 5;

  const generatePattern = useCallback((lvl: number) => {
    const count = Math.min(lvl + 2, 12);
    const cells = new Set<number>();
    while (cells.size < count) {
      cells.add(Math.floor(Math.random() * (GRID * GRID)));
    }
    return cells;
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
    ctx.fillText(`Level ${level} | Score: ${score}`, canvas.width / 2, 25);

    const padding = 30;
    const gap = 6;
    const cellSize = (Math.min(canvas.width, canvas.height) - padding * 2 - gap * (GRID - 1)) / GRID;
    const startX = (canvas.width - GRID * (cellSize + gap) + gap) / 2;
    const startY = 45;

    for (let i = 0; i < GRID * GRID; i++) {
      const col = i % GRID;
      const row = Math.floor(i / GRID);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);

      const isActive = activeCells.has(i);
      const isInPattern = pattern[i];
      const isPlayerSelected = playerPattern[i];

      if (gameState === "showing" && isActive) {
        ctx.fillStyle = "#22C55E";
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 8);
        ctx.fill();
      } else if (gameState === "input" && isPlayerSelected) {
        ctx.fillStyle = isInPattern ? "#22C55E" : "#EF4444";
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 8);
        ctx.fill();
      } else {
        const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        grad.addColorStop(0, "#334155");
        grad.addColorStop(1, "#1E293B");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 8);
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (gameState === "showing") {
      ctx.fillStyle = "#EAB308";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Memorize the pattern!", canvas.width / 2, canvas.height - 15);
    } else if (gameState === "input") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click the cells that were green!", canvas.width / 2, canvas.height - 15);
    }
  }, [gameState, score, level, activeCells, pattern, playerPattern, GRID]);

  useEffect(() => {
    draw();
  }, [draw]);

  const showPattern = useCallback((cells: Set<number>) => {
    clearTimeouts();
    setGameState("showing");
    setActiveCells(cells);

    const t = setTimeout(() => {
      setActiveCells(new Set());
      setGameState("input");
      setPlayerPattern(new Array(GRID * GRID).fill(false));
    }, 1500 + cells.size * 100);
    timeoutsRef.current.push(t);
  }, [clearTimeouts]);

  const startGame = useCallback(() => {
    clearTimeouts();
    setScore(0);
    setLevel(1);
    const cells = generatePattern(1);
    setPattern(new Array(GRID * GRID).fill(false).map((_, i) => cells.has(i)));
    setGameState("playing");
    showPattern(cells);
  }, [generatePattern, showPattern, clearTimeouts]);

  const handleCellClick = useCallback((index: number) => {
    if (gameState !== "input") return;
    if (playerPattern[index]) return;

    const newPattern = [...playerPattern];
    newPattern[index] = true;
    setPlayerPattern(newPattern);

    const selectedCount = newPattern.filter(Boolean).length;
    if (selectedCount === pattern.filter(Boolean).length) {
      const correct = newPattern.every((v, i) => v === pattern[i]);
      if (correct) {
        const pts = level * 200;
        setScore(s => s + pts);
        const newLevel = level + 1;
        setLevel(newLevel);
        const newCells = generatePattern(newLevel);
        setPattern(new Array(GRID * GRID).fill(false).map((_, i) => newCells.has(i)));
        setTimeout(() => showPattern(newCells), 800);
      } else {
        if (score > highScore) setHighScore(score);
        setTimeout(() => setGameState("gameover"), 500);
      }
    }
  }, [gameState, playerPattern, pattern, level, score, highScore, generatePattern, showPattern]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "input") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const padding = 30;
    const gap = 6;
    const cellSize = (Math.min(canvas.width, canvas.height) - padding * 2 - gap * (GRID - 1)) / GRID;
    const startX = (canvas.width - GRID * (cellSize + gap) + gap) / 2;
    const startY = 45;

    for (let i = 0; i < GRID * GRID; i++) {
      const col = i % GRID;
      const row = Math.floor(i / GRID);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      if (clickX >= x && clickX <= x + cellSize && clickY >= y && clickY <= y + cellSize) {
        handleCellClick(i);
        break;
      }
    }
  }, [gameState, handleCellClick]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        if (gameState === "idle" || gameState === "gameover") {
          e.preventDefault();
          startGame();
        }
      }
      if (gameState === "input" && e.key >= "1" && e.key <= "9") {
        handleCellClick(parseInt(e.key) - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleCellClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Pattern Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Memorize the green cell pattern, then recreate it!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Pattern!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
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
