"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "won" | "gameover";

const LEVELS = [
  { width: 6, height: 6, boxes: 3 },
  { width: 7, height: 7, boxes: 4 },
  { width: 8, height: 8, boxes: 5 },
];

type Tile = "wall" | "floor" | "box" | "target" | "box_on_target" | "player" | "player_on_target";

const parseLevel = (levelIdx: number) => {
  const config = LEVELS[levelIdx % LEVELS.length];
  const { width, height, boxes } = config;
  const grid: Tile[][] = Array.from({ length: height }, () => Array(width).fill("floor" as Tile));

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (r === 0 || r === height - 1 || c === 0 || c === width - 1) grid[r][c] = "wall";
    }
  }

  for (let i = 0; i < boxes; i++) {
    const r = 1 + Math.floor(Math.random() * (height - 3));
    const c = 1 + Math.floor(Math.random() * (width - 3));
    if (grid[r][c] === "floor") grid[r][c] = "box";
  }

  for (let i = 0; i < boxes; i++) {
    const r = 1 + Math.floor(Math.random() * (height - 3));
    const c = 1 + Math.floor(Math.random() * (width - 3));
    if (grid[r][c] === "floor") {
      grid[r][c] = "target";
    } else if (grid[r][c] === "box") {
      grid[r][c] = "box_on_target";
    }
  }

  grid[1][1] = grid[1][1] === "target" ? "player_on_target" : "player";

  return { grid, width, height };
};

const canMove = (grid: Tile[][], dr: number, dc: number) => {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === "player" || grid[r][c] === "player_on_target") {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return false;
        if (grid[nr][nc] === "wall") return false;
        if ((grid[nr][nc] === "box" || grid[nr][nc] === "box_on_target")) {
          const nnr = nr + dr;
          const nnc = nc + dc;
          if (nnr < 0 || nnr >= grid.length || nnc < 0 || nnc >= grid[0].length) return false;
          if (grid[nnr][nnc] === "wall" || grid[nnr][nnc] === "box" || grid[nnr][nnc] === "box_on_target") return false;
        }
      }
    }
  }
  return true;
};

const move = (grid: Tile[][], dr: number, dc: number): Tile[][] => {
  const newGrid = grid.map((r) => [...r]);
  let pr = -1, pc = -1;
  for (let r = 0; r < newGrid.length; r++) {
    for (let c = 0; c < newGrid[0].length; c++) {
      if (newGrid[r][c] === "player" || newGrid[r][c] === "player_on_target") { pr = r; pc = c; break; }
    }
    if (pr !== -1) break;
  }
  if (pr === -1) return newGrid;

  const nr = pr + dr;
  const nc = pc + dc;

  newGrid[pr][pc] = newGrid[pr][pc] === "player_on_target" ? "target" : "floor";

  if (newGrid[nr][nc] === "box" || newGrid[nr][nc] === "box_on_target") {
    const nnr = nr + dr;
    const nnc = nc + dc;
    newGrid[nnr][nnc] = newGrid[nnr][nnc] === "target" ? "box_on_target" : "box";
    newGrid[nr][nc] = newGrid[nr][nc] === "box_on_target" ? "player_on_target" : "player";
  } else {
    newGrid[nr][nc] = newGrid[nr][nc] === "target" ? "player_on_target" : "player";
  }

  return newGrid;
};

const isWon = (grid: Tile[][]) => !grid.some((row) => row.includes("box"));

const TILE_COLORS: Record<Tile, string> = {
  wall: "#374151",
  floor: "#1F2937",
  box: "#F97316",
  target: "#22C55E",
  box_on_target: "#EAB308",
  player: "#3B82F6",
  player_on_target: "#3B82F6",
};

export default function Sokoban() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [moves, setMoves] = useState(0);
  const [pushes, setPushes] = useState(0);
  const CELL = 40;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    grid.forEach((row, r) => {
      row.forEach((tile, c) => {
        const x = c * CELL;
        const y = r * CELL;

        ctx.fillStyle = TILE_COLORS[tile];
        ctx.fillRect(x, y, CELL - 1, CELL - 1);

        if (tile === "box" || tile === "box_on_target") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("□", x + CELL / 2, y + CELL / 2);
        }
        if (tile === "target") {
          ctx.fillStyle = "#22C55E";
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        if (tile === "player" || tile === "player_on_target") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("@", x + CELL / 2, y + CELL / 2);
        }
      });
    });
  }, [grid]);

  const startGame = useCallback(() => {
    const { grid: g } = parseLevel(level);
    setGrid(g);
    setMoves(0);
    setPushes(0);
    setGameState("playing");
  }, [level]);

  const handleMove = useCallback((dr: number, dc: number) => {
    if (gameState !== "playing") return;
    if (!canMove(grid, dr, dc)) return;

    let pr = -1, pc = -1;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === "player" || grid[r][c] === "player_on_target") { pr = r; pc = c; }
      }
    }
    const nr = pr + dr;
    const nc = pc + dc;
    const isPush = grid[nr][nc] === "box" || grid[nr][nc] === "box_on_target";

    const newGrid = move(grid, dr, dc);
    setGrid(newGrid);
    setMoves((m) => m + 1);
    if (isPush) setPushes((p) => p + 1);

    if (isWon(newGrid)) {
      const pts = Math.max(100, 500 - moves * 5 - pushes * 10);
      setScore((s) => s + pts);
      setGameState("won");
    }
  }, [gameState, grid, moves, pushes]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "playing") {
        if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); handleMove(-1, 0); }
        if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); handleMove(1, 0); }
        if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); handleMove(0, -1); }
        if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); handleMove(0, 1); }
      }
      if (e.key === "r" || e.key === "R") startGame();
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "won")) {
        e.preventDefault();
        if (gameState === "won") setLevel((l) => l + 1);
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleMove, startGame]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Sokoban</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Pushes: {pushes}</span>
        <span className="text-green-400">Level: {level + 1}</span>
      </div>

      {grid.length > 0 && (
        <canvas
          ref={canvasRef}
          width={grid[0].length * CELL}
          height={grid.length * CELL}
          className="rounded-lg"
        />
      )}

      {gameState === "playing" && (
        <p className="text-gray-400 text-sm">Arrow keys or WASD to move. R to restart. Push all boxes onto green targets!</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Push all orange boxes onto the green targets.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Level 1</button>
        </div>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Level Complete! 🎉</p>
          <p className="text-white">Moves: {moves} | Pushes: {pushes}</p>
          <button onClick={() => { setLevel((l) => l + 1); startGame(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Next Level</button>
        </div>
      )}
    </div>
  );
}
