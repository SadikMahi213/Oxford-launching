"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover" | "won";
type Grid = number[][];

const SIZE = 4;

function newGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandomTile(grid: Grid): Grid {
  const g = grid.map((r) => [...r]);
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return g;
}

function slide(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter((v) => v !== 0);
  let score = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, score };
}

function rotate(grid: Grid, times: number): Grid {
  let g = grid.map((r) => [...r]);
  for (let t = 0; t < times; t++) {
    const ng = newGrid();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        ng[c][SIZE - 1 - r] = g[r][c];
      }
    }
    g = ng;
  }
  return g;
}

function move(grid: Grid, dir: number): { grid: Grid; score: number; moved: boolean } {
  let g = rotate(grid, dir);
  let totalScore = 0;
  for (let r = 0; r < SIZE; r++) {
    const { row, score } = slide(g[r]);
    g[r] = row;
    totalScore += score;
  }
  g = rotate(g, (4 - dir) % 4);

  const moved = grid.some((row, ri) => row.some((v, ci) => v !== g[ri][ci]));
  return { grid: g, score: totalScore, moved };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  0: "bg-gray-700/50 text-gray-600",
  2: "bg-yellow-100 text-gray-800",
  4: "bg-yellow-200 text-gray-800",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-red-400 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-yellow-600 text-white",
  1024: "bg-yellow-500 text-white",
  2048: "bg-yellow-400 text-white",
};

export default function Game2048() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [grid, setGrid] = useState<Grid>(newGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const initGame = useCallback(() => {
    let g = newGrid();
    g = addRandomTile(g);
    g = addRandomTile(g);
    setGrid(g);
    setScore(0);
    setGameState("playing");
  }, []);

  const handleMove = useCallback(
    (dir: number) => {
      if (gameState !== "playing") return;
      const { grid: newGrid, score: gained, moved } = move(grid, dir);
      if (!moved) return;
      const final = addRandomTile(newGrid);
      setGrid(final);
      const newScore = score + gained;
      setScore(newScore);

      let hasWon = false;
      for (const row of final) {
        for (const v of row) {
          if (v === 2048) hasWon = true;
        }
      }

      if (hasWon) {
        setGameState("won");
        if (newScore > highScore) setHighScore(newScore);
      } else if (!canMove(final)) {
        setGameState("gameover");
        if (newScore > highScore) setHighScore(newScore);
      }
    },
    [grid, score, gameState, highScore]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle") { initGame(); return; }
      if (gameState !== "playing" && gameState !== "won") return;
      switch (e.key) {
        case "ArrowUp": case "w": e.preventDefault(); handleMove(0); break;
        case "ArrowRight": case "d": e.preventDefault(); handleMove(1); break;
        case "ArrowDown": case "s": e.preventDefault(); handleMove(2); break;
        case "ArrowLeft": case "a": e.preventDefault(); handleMove(3); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleMove, gameState, initGame]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 1 : 3);
    } else {
      handleMove(dy > 0 ? 2 : 0);
    }
  };

  const getTileSize = (val: number) => {
    if (val >= 1024) return "text-xl";
    if (val >= 128) return "text-2xl";
    return "text-3xl";
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">2048</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-yellow-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Best: <span className="text-orange-400 font-bold">{highScore}</span></span>
      </div>
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to slide tiles</p>
          <button onClick={initGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "won" || gameState === "gameover") && (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="grid grid-cols-4 gap-2 p-3 bg-gray-800 rounded-xl"
          style={{ width: "320px" }}
        >
          {grid.flat().map((val, i) => (
            <div
              key={i}
              className={`w-full aspect-square rounded-lg flex items-center justify-center font-bold transition-all ${TILE_COLORS[val] || "bg-yellow-300 text-white"} ${getTileSize(val)}`}
            >
              {val || ""}
            </div>
          ))}
        </div>
      )}
      {gameState === "won" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-yellow-900/50 rounded-xl text-center border border-yellow-500">
            <p className="text-3xl font-bold text-yellow-400">You reached 2048!</p>
            <p className="text-white mt-2">Score: {score}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setGameState("playing")} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition">Keep Playing</button>
            <button onClick={initGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">New Game</button>
          </div>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={initGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
