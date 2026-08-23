"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Grid = (number | null)[][];

function generatePuzzle(): { puzzle: Grid; solution: Grid } {
  const base: number[][] = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  for (let i = 0; i < 200; i++) {
    const a = Math.floor(Math.random() * 9);
    const b = Math.floor(Math.random() * 9);
    const type = Math.floor(Math.random() * 3);
    if (type === 0) {
      [base[a], base[b]] = [base[b], base[a]];
    } else if (type === 1) {
      for (let r = 0; r < 9; r++) {
        [base[r][a], base[r][b]] = [base[r][b], base[r][a]];
      }
    } else {
      const box = Math.floor(Math.random() * 3) * 3;
      [base[box + a % 3], base[box + b % 3]] = [base[box + b % 3], base[box + a % 3]];
    }
  }

  const solution = base.map((r) => [...r]);
  const puzzle = base.map((r) =>
    r.map((v) => (Math.random() < 0.45 ? null : v))
  );

  return { puzzle, solution };
}

export default function Sudoku() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [puzzle, setPuzzle] = useState<Grid>([]);
  const [grid, setGrid] = useState<Grid>([]);
  const [solution, setSolution] = useState<(number | null)[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const startGame = useCallback(() => {
    const { puzzle: p, solution: s } = generatePuzzle();
    setPuzzle(p);
    setGrid(p.map((r) => [...r]));
    setSolution(s);
    setErrors(new Set());
    setTimer(0);
    setSelected(null);
    setGameState("playing");
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== "playing") return;
    if (puzzle[r][c] !== null) return;
    setSelected([r, c]);
  };

  const handleNumberInput = (num: number) => {
    if (gameState !== "playing" || !selected) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== null) return;

    const newGrid = grid.map((row) => [...row]);
    newGrid[r][c] = num === 0 ? null : num;
    setGrid(newGrid);

    if (num !== 0 && num !== solution[r][c]) {
      setErrors((prev) => new Set(prev).add(`${r},${c}`));
    } else {
      setErrors((prev) => {
        const next = new Set(prev);
        next.delete(`${r},${c}`);
        return next;
      });
    }

    const isComplete = newGrid.every((row, ri) =>
      row.every((cell, ci) => cell === solution[ri][ci])
    );
    if (isComplete) {
      setGameState("gameover");
    }
  };

  const isCellConflict = (r: number, c: number, val: number): boolean => {
    for (let i = 0; i < 9; i++) {
      if (i !== c && grid[r][i] === val) return true;
      if (i !== r && grid[i][c] === val) return true;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const nr = br + dr;
        const nc = bc + dc;
        if ((nr !== r || nc !== c) && grid[nr][nc] === val) return true;
      }
    }
    return false;
  };

  const getCellBg = (r: number, c: number): string => {
    if (selected && selected[0] === r && selected[1] === c) return "bg-blue-600";
    if (selected) {
      const [sr, sc] = selected;
      if (r === sr || c === sc) return "bg-blue-900/30";
      const br = Math.floor(sr / 3) * 3;
      const bc = Math.floor(sc / 3) * 3;
      if (Math.floor(r / 3) * 3 === br && Math.floor(c / 3) * 3 === bc) return "bg-blue-900/30";
    }
    if (errors.has(`${r},${c}`)) return "bg-red-900/50";
    if (puzzle[r]?.[c] !== null) return "bg-gray-700";
    return "bg-gray-800 hover:bg-gray-700";
  };

  const isComplete = grid.every((row, ri) => row.every((cell, ci) => cell === solution[ri]?.[ci]));

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Sudoku</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Time: <span className="text-blue-400 font-bold">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</span></span>
        <span className="text-gray-400">Errors: <span className="text-red-400 font-bold">{errors.size}</span></span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${difficulty === d ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">New Puzzle</button>
        </div>
      )}

      {gameState !== "idle" && grid.length > 0 && (
        <>
          <div className="grid grid-cols-9 gap-0 bg-gray-600 p-0.5 rounded-lg" style={{ width: "360px", maxWidth: "100%" }}>
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`aspect-square flex items-center justify-center text-lg font-bold border border-gray-600 transition ${getCellBg(r, c)} ${
                    (c + 1) % 3 === 0 && c < 8 ? "border-r-2 border-r-gray-400" : ""
                  } ${(r + 1) % 3 === 0 && r < 8 ? "border-b-2 border-b-gray-400" : ""} ${
                    cell && puzzle[r][c] === null ? "text-green-400" : cell ? "text-white" : "text-gray-500"
                  }`}
                >
                  {cell || ""}
                </button>
              ))
            )}
          </div>

          <div className="flex gap-1 flex-wrap justify-center max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button
                key={n}
                onClick={() => handleNumberInput(n)}
                className={`w-10 h-10 rounded font-bold text-lg transition ${
                  n === 0 ? "bg-red-800 text-white hover:bg-red-700" : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {n === 0 ? "✕" : n}
              </button>
            ))}
          </div>

          {isComplete && (
            <div className="p-6 bg-green-900/50 rounded-xl text-center border border-green-700">
              <p className="text-2xl font-bold text-green-400">Solved!</p>
              <p className="text-white mt-1">Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</p>
            </div>
          )}

          <button onClick={startGame} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition text-sm">New Puzzle</button>
        </>
      )}
    </div>
  );
}
