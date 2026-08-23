"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "won" | "gameover";

const GRID_SIZE = 8;
const CELL = 55;

type PipeDir = "horizontal" | "vertical" | "elbow_ur" | "elbow_ul" | "elbow_dr" | "elbow_dl" | "cross" | "empty";

interface Pipe {
  type: PipeDir;
  rotation: number;
  connected: boolean;
}

const PIPE_SHAPES: Record<PipeDir, number[][][]> = {
  horizontal: [[[0, 1], [0, 1], [0, 1]], [[1, 0], [1, 0], [1, 0]], [[0, 1], [0, 1], [0, 1]], [[1, 0], [1, 0], [1, 0]]],
  vertical: [[[1, 0], [1, 0], [1, 0]], [[0, 1], [0, 1], [0, 1]], [[1, 0], [1, 0], [1, 0]], [[0, 1], [0, 1], [0, 1]]],
  elbow_ur: [[[1, 0], [1, 1], [0, 0]], [[0, 1], [1, 1], [0, 0]], [[0, 0], [1, 1], [0, 1]], [[0, 0], [1, 1], [1, 0]]],
  elbow_ul: [[[0, 1], [1, 1], [0, 0]], [[0, 0], [1, 1], [1, 0]], [[1, 0], [1, 1], [0, 0]], [[0, 0], [1, 1], [0, 1]]],
  elbow_dr: [[[0, 0], [1, 1], [1, 0]], [[0, 0], [1, 1], [0, 1]], [[0, 1], [1, 1], [0, 0]], [[1, 0], [1, 1], [0, 0]]],
  elbow_dl: [[[0, 0], [1, 1], [0, 1]], [[1, 0], [1, 1], [0, 0]], [[0, 0], [1, 1], [1, 0]], [[0, 1], [1, 1], [0, 0]]],
  cross: [[[1, 1], [1, 1], [1, 1]], [[1, 1], [1, 1], [1, 1]], [[1, 1], [1, 1], [1, 1]], [[1, 1], [1, 1], [1, 1]]],
  empty: [[[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]]],
};

const generateGrid = (): Pipe[][] => {
  const types: PipeDir[] = ["horizontal", "vertical", "elbow_ur", "elbow_ul", "elbow_dr", "elbow_dl", "cross"];
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      type: types[Math.floor(Math.random() * types.length)],
      rotation: Math.floor(Math.random() * 4),
      connected: false,
    }))
  );
};

const checkConnections = (grid: Pipe[][]): boolean => {
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  grid[0][0].connected = true;

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const pipe = grid[r][c];

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || visited[nr][nc]) continue;

      const neighbor = grid[nr][nc];
      const shape = PIPE_SHAPES[pipe.type][pipe.rotation];
      const neighborShape = PIPE_SHAPES[neighbor.type][neighbor.rotation];

      let connected = false;
      if (dr === -1 && shape[0][1] === 1 && neighborShape[2][1] === 1) connected = true;
      if (dr === 1 && shape[2][1] === 1 && neighborShape[0][1] === 1) connected = true;
      if (dc === -1 && shape[1][0] === 1 && neighborShape[1][2] === 1) connected = true;
      if (dc === 1 && shape[1][2] === 1 && neighborShape[1][0] === 1) connected = true;

      if (connected) {
        visited[nr][nc] = true;
        grid[nr][nc].connected = true;
        queue.push([nr, nc]);
      }
    }
  }

  return grid.every((row) => row.every((p) => p.connected));
};

export default function PipePuzzle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<Pipe[][]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    grid.forEach((row, r) => {
      row.forEach((pipe, c) => {
        const x = c * CELL;
        const y = r * CELL;

        ctx.fillStyle = pipe.connected ? "#065F46" : "#1F2937";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL, CELL);

        const shape = PIPE_SHAPES[pipe.type][pipe.rotation];
        const pipeWidth = 8;

        ctx.fillStyle = pipe.connected ? "#22C55E" : "#6B7280";

        for (let sr = 0; sr < 3; sr++) {
          for (let sc = 0; sc < 3; sc++) {
            if (shape[sr][sc]) {
              const px = x + sc * (CELL / 3) + CELL / 6 - pipeWidth / 2;
              const py = y + sr * (CELL / 3) + CELL / 6 - pipeWidth / 2;
              ctx.fillRect(px, py, pipeWidth, pipeWidth);
            }
          }
        }

        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = pipe.connected ? "#22C55E" : "#9CA3AF";
        ctx.fill();
      });
    });
  }, [grid]);

  const startGame = useCallback(() => {
    setGrid(generateGrid());
    setMoves(0);
    setTimer(0);
    setScore(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== "playing") return;

    setGrid((prev) => {
      const newGrid = prev.map((r) => r.map((p) => ({ ...p })));
      newGrid[row][col].rotation = (newGrid[row][col].rotation + 1) % 4;
      return newGrid;
    });
    setMoves((m) => m + 1);
  }, [gameState]);

  useEffect(() => {
    if (grid.length > 0 && gameState === "playing") {
      const newGrid = grid.map((r) => r.map((p) => ({ ...p, connected: false })));
      if (checkConnections(newGrid)) {
        const pts = Math.max(100, 500 - moves * 5 - timer * 2);
        setScore(pts);
        setGameState("won");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  }, [grid, gameState, moves, timer]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "won")) {
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
      <h2 className="text-xl font-bold text-white">Pipe Puzzle</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Time: {formatTime(timer)}</span>
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
        <p className="text-gray-400 text-sm">Click pipes to rotate them. Connect all pipes from top-left!</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Rotate pipes to connect them all starting from the top-left corner.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">All Connected! 🎉</p>
          <p className="text-white">Score: {score} | Moves: {moves} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
