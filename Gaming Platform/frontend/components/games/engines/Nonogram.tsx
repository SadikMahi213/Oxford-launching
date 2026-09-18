"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const SIZE = 5;
const CELL = 52;

const generatePuzzle = () => {
  const solution: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Math.random() < 0.5)
  );
  const rowCounts = solution.map((row) => row.filter(Boolean).length);
  const colCounts = Array.from({ length: SIZE }, (_, c) =>
    solution.reduce((count, row) => count + (row[c] ? 1 : 0), 0)
  );
  return { solution, rowCounts, colCounts };
};

export default function Nonogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [solution, setSolution] = useState<boolean[][]>([]);
  const [rowCounts, setRowCounts] = useState<number[]>([]);
  const [colCounts, setColCounts] = useState<number[]>([]);
  const [playerGrid, setPlayerGrid] = useState<("empty" | "filled" | "marked")[][]>(
    Array.from({ length: SIZE }, () => Array(SIZE).fill("empty"))
  );
  const [timer, setTimer] = useState(0);
  const [errors, setErrors] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const MARGIN_LEFT = 80;
  const MARGIN_TOP = 80;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    colCounts.forEach((count, c) => {
      ctx.fillText(String(count), MARGIN_LEFT + c * CELL + CELL / 2, MARGIN_TOP - 15);
    });
    ctx.textAlign = "right";
    rowCounts.forEach((count, r) => {
      ctx.fillText(String(count), MARGIN_LEFT - 15, MARGIN_TOP + r * CELL + CELL / 2 + 5);
    });

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = MARGIN_LEFT + c * CELL;
        const y = MARGIN_TOP + r * CELL;
        const cell = playerGrid[r][c];

        if (cell === "filled") {
          ctx.fillStyle = "#3B82F6";
        } else if (cell === "marked") {
          ctx.fillStyle = "#374151";
        } else {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#1F2937" : "#111827";
        }
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL, CELL);

        if (cell === "marked") {
          ctx.strokeStyle = "#EF4444";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 8);
          ctx.lineTo(x + CELL - 8, y + CELL - 8);
          ctx.moveTo(x + CELL - 8, y + 8);
          ctx.lineTo(x + 8, y + CELL - 8);
          ctx.stroke();
        }
      }
    }
  }, [playerGrid, rowCounts, colCounts]);

  const checkSolution = useCallback(() => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const shouldFill = solution[r][c];
        const isFilled = playerGrid[r][c] === "filled";
        if (shouldFill !== isFilled) return false;
      }
    }
    return true;
  }, [solution, playerGrid]);

  const handleCellClick = useCallback((row: number, col: number, isRightClick: boolean) => {
    if (gameState !== "playing") return;

    setPlayerGrid((prev) => {
      const newGrid = prev.map((r) => [...r]);
      if (isRightClick) {
        if (newGrid[row][col] === "empty") newGrid[row][col] = "marked";
        else if (newGrid[row][col] === "marked") newGrid[row][col] = "empty";
      } else {
        if (newGrid[row][col] === "empty") newGrid[row][col] = "filled";
        else if (newGrid[row][col] === "filled") newGrid[row][col] = "empty";
        else if (newGrid[row][col] === "marked") newGrid[row][col] = "filled";
      }

      if (newGrid[row][col] === "filled" && !solution[row][col]) {
        setErrors((e) => e + 1);
      }

      return newGrid;
    });
  }, [gameState, solution]);

  useEffect(() => {
    if (checkSolution() && gameState === "playing") {
      const bonus = Math.max(0, 500 - errors * 20 - timer * 2);
      setScore(500 + bonus);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [playerGrid, checkSolution, gameState, errors, timer]);

  const startGame = useCallback(() => {
    const { solution: s, rowCounts: rc, colCounts: cc } = generatePuzzle();
    setSolution(s);
    setRowCounts(rc);
    setColCounts(cc);
    setPlayerGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill("empty")));
    setErrors(0);
    setTimer(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Nonogram</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Time: {formatTime(timer)}</span>
        <span className="text-red-400">Errors: {errors}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={MARGIN_LEFT + SIZE * CELL + 10}
        height={MARGIN_TOP + SIZE * CELL + 10}
        className="rounded-lg cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const canvasX = ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width;
          const canvasY = ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height;
          const col = Math.floor((canvasX - MARGIN_LEFT) / CELL);
          const row = Math.floor((canvasY - MARGIN_TOP) / CELL);
          if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) handleCellClick(row, col, false);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const canvasX = ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width;
          const canvasY = ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height;
          const col = Math.floor((canvasX - MARGIN_LEFT) / CELL);
          const row = Math.floor((canvasY - MARGIN_TOP) / CELL);
          if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) handleCellClick(row, col, true);
        }}
      />

      {gameState === "playing" && (
        <p className="text-gray-400 text-sm">Left click to fill, right click to mark. Match the row/column numbers.</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Paint cells to match the number clues. Left-click fills, right-click marks.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Puzzle (Space)</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Puzzle Solved! 🎉</p>
          <p className="text-white">Score: {score} | Errors: {errors} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">New Puzzle</button>
        </div>
      )}
    </div>
  );
}
