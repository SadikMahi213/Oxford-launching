"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const GRID_SIZE = 8;
const CELL = 50;

const generatePuzzle = () => {
  const lights: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Math.random() < 0.3)
  );
  return lights;
};

const toggleLights = (grid: boolean[][], row: number, col: number): boolean[][] => {
  const newGrid = grid.map((r) => [...r]);
  const toggle = (r: number, c: number) => {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) newGrid[r][c] = !newGrid[r][c];
  };

  toggle(row, col);
  toggle(row - 1, col);
  toggle(row + 1, col);
  toggle(row, col - 1);
  toggle(row, col + 1);

  return newGrid;
};

const isSolved = (grid: boolean[][]) => !grid.some((row) => row.some((cell) => cell));

export default function LightUp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const x = c * CELL;
        const y = r * CELL;

        if (cell) {
          ctx.fillStyle = "#EAB308";
          ctx.shadowColor = "#EAB308";
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = "#1F2937";
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

        if (cell) {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#EAB308";
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  }, [grid]);

  const startGame = useCallback(() => {
    setGrid(generatePuzzle());
    setMoves(0);
    setTimer(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== "playing") return;
    setGrid((prev) => toggleLights(prev, row, col));
    setMoves((m) => m + 1);
  }, [gameState]);

  useEffect(() => {
    if (grid.length > 0 && isSolved(grid) && gameState === "playing") {
      const pts = Math.max(100, 500 - moves * 10 - timer * 3 + level * 100);
      setScore((s) => s + pts);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [grid, gameState, moves, timer, level]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        if (gameState === "gameover") setLevel((l) => l + 1);
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Light Up</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Level: {level}</span>
        <span className="text-green-400">Time: {formatTime(timer)}</span>
      </div>

      {grid.length > 0 && (
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL}
          height={GRID_SIZE * CELL}
          className="rounded-lg cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const col = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
            const row = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
            if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) handleCellClick(row, col);
          }}
        />
      )}

      {gameState === "playing" && (
        <p className="text-gray-400 text-sm">Click a cell to toggle it and its neighbors. Turn off all lights!</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Click cells to toggle lights. Turn off all lights to win!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">All Lights Off! 🎉</p>
          <p className="text-white">Moves: {moves} | Time: {formatTime(timer)}</p>
          <button onClick={() => { setLevel((l) => l + 1); startGame(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Next Level</button>
        </div>
      )}
    </div>
  );
}
