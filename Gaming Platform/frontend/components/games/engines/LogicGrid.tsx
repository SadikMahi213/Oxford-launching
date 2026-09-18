"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

interface Clue {
  id: number;
  text: string;
  answer: string;
}

const PUZZLES: Clue[][] = [
  [
    { id: 1, text: "Alex plays piano and has a cat", answer: "ALEX" },
    { id: 2, text: "Beth likes hiking and owns a dog", answer: "BETH" },
    { id: 3, text: "Carl enjoys painting and rides a bike", answer: "CARL" },
    { id: 4, text: "Dana swims competitively and reads books", answer: "DANA" },
  ],
  [
    { id: 1, text: "Red car is fastest", answer: "RED" },
    { id: 2, text: "Blue house is tallest", answer: "BLUE" },
    { id: 3, text: "Green garden is largest", answer: "GREEN" },
  ],
];

const GRID_SIZE = 4;
const CELL = 60;

export default function LogicGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [clues, setClues] = useState<Clue[]>([]);
  const [grid, setGrid] = useState<("empty" | "yes" | "no")[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("empty"))
  );
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [colLabels, setColLabels] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [timer, setTimer] = useState(0);
  const [hints, setHints] = useState(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = 100;
    const oy = 60;

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    colLabels.forEach((label, c) => {
      ctx.save();
      ctx.translate(ox + c * CELL + CELL / 2, oy - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    ctx.textAlign = "right";
    rowLabels.forEach((label, r) => {
      ctx.fillText(label, ox - 10, oy + r * CELL + CELL / 2 + 4);
    });

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = ox + c * CELL;
        const y = oy + r * CELL;
        const cell = grid[r][c];
        const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;

        if (cell === "yes") ctx.fillStyle = "#22C55E";
        else if (cell === "no") ctx.fillStyle = "#EF4444";
        else if (isSelected) ctx.fillStyle = "#374151";
        else ctx.fillStyle = "#1F2937";

        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL, CELL);

        if (cell === "yes") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", x + CELL / 2, y + CELL / 2);
        } else if (cell === "no") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✗", x + CELL / 2, y + CELL / 2);
        }
      }
    }
  }, [grid, rowLabels, colLabels, selectedCell]);

  const startGame = useCallback(() => {
    const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];
    setClues(puzzle);
    const rows = puzzle.map((c) => c.answer);
    const cols = ["Category A", "Category B", "Category C", "Category D"].slice(0, GRID_SIZE);
    setRowLabels(rows);
    setColLabels(cols);
    setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("empty")));
    setSelectedCell(null);
    setTimer(0);
    setHints(3);
    setScore(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, [puzzleIdx]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== "playing") return;

    setGrid((prev) => {
      const newGrid = prev.map((r) => [...r]);
      if (newGrid[row][col] === "empty") newGrid[row][col] = "yes";
      else if (newGrid[row][col] === "yes") newGrid[row][col] = "no";
      else newGrid[row][col] = "empty";
      return newGrid;
    });
    setSelectedCell({ row, col });
  }, [gameState]);

  const useHint = useCallback(() => {
    if (hints <= 0 || gameState !== "playing") return;

    const newGrid = grid.map((r) => [...r]);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] === "empty") {
          newGrid[r][c] = r === c ? "yes" : "no";
          setGrid(newGrid);
          setHints((h) => h - 1);
          return;
        }
      }
    }
  }, [hints, gameState, grid]);

  const checkWin = useCallback(() => {
    for (let r = 0; r < GRID_SIZE; r++) {
      const hasYes = grid[r].some((c) => c === "yes");
      const yesCount = grid[r].filter((c) => c === "yes").length;
      if (!hasYes || yesCount !== 1) return false;
    }
    return true;
  }, [grid]);

  useEffect(() => {
    if (checkWin() && gameState === "playing") {
      const bonus = Math.max(0, 500 - timer * 3 + hints * 50);
      setScore(bonus);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [grid, checkWin, gameState, timer, hints]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Logic Grid</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Time: {formatTime(timer)}</span>
        <span className="text-blue-400">Hints: {hints}</span>
      </div>

      {clues.length > 0 && (
        <div className="bg-gray-800 rounded p-2 text-sm text-gray-300 max-w-md">
          {clues.map((c) => <p key={c.id}>{c.text}</p>)}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={100 + GRID_SIZE * CELL + 20}
        height={60 + GRID_SIZE * CELL + 20}
        className="rounded-lg cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const canvasX = ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width;
          const canvasY = ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height;
          const col = Math.floor((canvasX - 100) / CELL);
          const row = Math.floor((canvasY - 60) / CELL);
          if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) handleCellClick(row, col);
        }}
      />

      {gameState === "playing" && (
        <div className="flex gap-2">
          <button onClick={useHint} disabled={hints <= 0} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Use Hint ({hints})</button>
          <p className="text-gray-400 text-sm self-center">Click cells to toggle ✓/✗</p>
        </div>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Use logic to match items. Click cells to mark yes/no.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Puzzle</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Puzzle Solved! 🎉</p>
          <p className="text-white">Score: {score} | Time: {formatTime(timer)}</p>
          <button onClick={() => { setPuzzleIdx((p) => p + 1); setGameState("idle"); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Next Puzzle</button>
        </div>
      )}
    </div>
  );
}
