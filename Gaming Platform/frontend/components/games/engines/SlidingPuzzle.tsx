"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const GRID = 4;
const CELL = 80;

const generateBoard = (): number[] => {
  const tiles = Array.from({ length: GRID * GRID - 1 }, (_, i) => i + 1);
  tiles.push(0);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const inversions = tiles.reduce((count, t, i) => {
    for (let j = i + 1; j < tiles.length; j++) {
      if (t !== 0 && tiles[j] !== 0 && t > tiles[j]) count++;
    }
    return count;
  }, 0);
  const emptyRow = Math.floor(tiles.indexOf(0) / GRID);
  if ((inversions + emptyRow) % 2 !== 0) {
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
};

const isSolved = (board: number[]) =>
  board.every((val, i) => (i < board.length - 1 ? val === i + 1 : val === 0));

const getMoves = (board: number[], pos: number): number[] => {
  const row = Math.floor(pos / GRID);
  const col = pos % GRID;
  const moves: number[] = [];
  if (row > 0) moves.push(pos - GRID);
  if (row < GRID - 1) moves.push(pos + GRID);
  if (col > 0) moves.push(pos - 1);
  if (col < GRID - 1) moves.push(pos + 1);
  return moves;
};

const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F43F5E", "#6366F1", "#84CC16", "#F59E0B", "#06B6D4", "#A855F7", "#D97706"];

export default function SlidingPuzzle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = (canvas.width - GRID * CELL) / 2;
    const oy = (canvas.height - GRID * CELL) / 2;

    board.forEach((val, idx) => {
      const row = Math.floor(idx / GRID);
      const col = idx % GRID;
      const x = ox + col * CELL;
      const y = oy + row * CELL;

      if (val === 0) {
        ctx.fillStyle = "#111827";
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        return;
      }

      ctx.fillStyle = COLORS[(val - 1) % COLORS.length];
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), x + CELL / 2, y + CELL / 2);
    });
  }, [board]);

  const startGame = useCallback(() => {
    setBoard(generateBoard());
    setMoves(0);
    setTimer(0);
    setScore(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  const moveTile = useCallback((idx: number) => {
    if (gameState !== "playing") return;
    const emptyIdx = board.indexOf(0);
    const validMoves = getMoves(board, emptyIdx);
    if (!validMoves.includes(idx)) return;

    setBoard((prev) => {
      const newBoard = [...prev];
      [newBoard[emptyIdx], newBoard[idx]] = [newBoard[idx], newBoard[emptyIdx]];
      return newBoard;
    });
    setMoves((m) => m + 1);
  }, [gameState, board]);

  useEffect(() => {
    if (board.length > 0 && isSolved(board) && gameState === "playing") {
      const scoreVal = Math.max(0, 2000 - moves * 10 - timer * 3);
      setScore(scoreVal);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [board, gameState, moves, timer]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ox = (canvas.width - GRID * CELL) / 2;
    const oy = (canvas.height - GRID * CELL) / 2;
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const col = Math.floor((mx - ox) / CELL);
    const row = Math.floor((my - oy) / CELL);

    if (row >= 0 && row < GRID && col >= 0 && col < GRID) {
      moveTile(row * GRID + col);
    }
  }, [gameState, moveTile]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const emptyIdx = board.indexOf(0);
      const emptyRow = Math.floor(emptyIdx / GRID);
      const emptyCol = emptyIdx % GRID;

      if (e.key === "ArrowUp" && emptyRow < GRID - 1) moveTile(emptyIdx + GRID);
      if (e.key === "ArrowDown" && emptyRow > 0) moveTile(emptyIdx - GRID);
      if (e.key === "ArrowLeft" && emptyCol < GRID - 1) moveTile(emptyIdx + 1);
      if (e.key === "ArrowRight" && emptyCol > 0) moveTile(emptyIdx - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, board, moveTile]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Sliding Puzzle</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Time: {formatTime(timer)}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={GRID * CELL + 20}
        height={GRID * CELL + 20}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
      />

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Slide tiles into order 1-15. Use arrow keys or click tiles.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Solved! 🎉</p>
          <p className="text-white">Score: {score} | Moves: {moves} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
