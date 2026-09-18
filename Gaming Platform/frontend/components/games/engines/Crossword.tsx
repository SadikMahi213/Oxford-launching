"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

interface Clue {
  number: number;
  across?: string;
  down?: string;
  acrossAnswer?: string;
  downAnswer?: string;
  acrossClue?: string;
  downClue?: string;
}

const GRID_SIZE = 8;

const generatePuzzle = () => {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const blackCells: boolean[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  const patterns = [
    [0, 2], [0, 5], [1, 4], [2, 0], [2, 7], [3, 3], [4, 4], [5, 0], [5, 3], [6, 2], [7, 0], [7, 5],
  ];
  patterns.forEach(([r, c]) => {
    if (r < GRID_SIZE && c < GRID_SIZE) blackCells[r][c] = true;
  });

  const words = [
    { word: "REACT", row: 0, col: 0, dir: "across" as const },
    { word: "NODE", row: 0, col: 5, dir: "down" as const },
    { word: "PIXEL", row: 1, col: 0, dir: "across" as const },
    { word: "GAME", row: 2, col: 1, dir: "down" as const },
    { word: "LOOP", row: 3, col: 0, dir: "across" as const },
    { word: "VOID", row: 3, col: 5, dir: "down" as const },
    { word: "DATA", row: 4, col: 0, dir: "across" as const },
    { word: "BYTE", row: 5, col: 4, dir: "across" as const },
    { word: "CODE", row: 6, col: 0, dir: "across" as const },
    { word: "FLOW", row: 7, col: 0, dir: "across" as const },
    { word: "HASH", row: 0, col: 3, dir: "down" as const },
  ];

  words.forEach(({ word, row, col, dir }) => {
    word.split("").forEach((ch, i) => {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
      if (r < GRID_SIZE && c < GRID_SIZE && !blackCells[r][c]) {
        grid[r][c] = ch;
      }
    });
  });

  return { grid, blackCells, words };
};

const PUZZLE = generatePuzzle();

export default function Crossword() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [playerGrid, setPlayerGrid] = useState<(string | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  const [activeClue, setActiveClue] = useState("");

  const CELL = 42;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { grid, blackCells } = PUZZLE;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = c * CELL;
        const y = r * CELL;

        if (blackCells[r][c]) {
          ctx.fillStyle = "#1F2937";
        } else if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
          ctx.fillStyle = "#3B82F6";
        } else {
          ctx.fillStyle = "#fff";
        }
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#6B7280";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL, CELL);

        if (!blackCells[r][c] && grid[r][c]) {
          ctx.fillStyle = "#9CA3AF";
          ctx.font = "9px Arial";
          ctx.textAlign = "left";
          ctx.fillText(String(r * GRID_SIZE + c + 1), x + 2, y + 10);
        }

        const playerVal = playerGrid[r][c];
        if (playerVal && !blackCells[r][c]) {
          ctx.fillStyle = "#111827";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(playerVal, x + CELL / 2, y + CELL / 2 + 3);
        }
      }
    }
  }, [playerGrid, selectedCell]);

  const checkCompleted = useCallback(() => {
    const { grid } = PUZZLE;
    const newCompleted = new Set(completedWords);
    let newScore = score;

    PUZZLE.words.forEach((w, idx) => {
      if (newCompleted.has(`${idx}`)) return;
      let complete = true;
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === "across" ? w.row : w.row + i;
        const c = w.dir === "across" ? w.col + i : w.col;
        if (playerGrid[r]?.[c] !== grid[r][c]) {
          complete = false;
          break;
        }
      }
      if (complete) {
        newCompleted.add(`${idx}`);
        newScore += 50;
      }
    });

    setCompletedWords(newCompleted);
    setScore(newScore);

    if (newCompleted.size === PUZZLE.words.length) {
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [playerGrid, completedWords, score]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== "playing") return;
    const { blackCells } = PUZZLE;
    if (blackCells[row][col]) return;

    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    }
    setSelectedCell({ row, col });

    let clueText = "";
    if (direction === "across") {
      const w = PUZZLE.words.find((w) => w.dir === "across" && w.row === row && col >= w.col && col < w.col + w.word.length);
      if (w) clueText = `${w.word}`;
    } else {
      const w = PUZZLE.words.find((w) => w.dir === "down" && w.col === col && row >= w.row && row < w.row + w.word.length);
      if (w) clueText = `${w.word}`;
    }
    setActiveClue(clueText);
  }, [gameState, selectedCell, direction]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameState !== "playing" || !selectedCell) return;
    const { row, col } = selectedCell;

    if (/^[a-zA-Z]$/.test(e.key)) {
      const newGrid = playerGrid.map((r) => [...r]);
      newGrid[row][col] = e.key.toUpperCase();
      setPlayerGrid(newGrid);

      const nextR = direction === "across" ? row : row + 1;
      const nextC = direction === "across" ? col + 1 : col;
      if (nextR < GRID_SIZE && nextC < GRID_SIZE && !PUZZLE.blackCells[nextR][nextC]) {
        setSelectedCell({ row: nextR, col: nextC });
      }

      setTimeout(checkCompleted, 50);
    }

    if (e.key === "Backspace") {
      const newGrid = playerGrid.map((r) => [...r]);
      if (newGrid[row][col]) {
        newGrid[row][col] = null;
      } else {
        const prevR = direction === "across" ? row : row - 1;
        const prevC = direction === "across" ? col - 1 : col;
        if (prevR >= 0 && prevC >= 0) {
          newGrid[prevR][prevC] = null;
          setSelectedCell({ row: prevR, col: prevC });
        }
      }
      setPlayerGrid(newGrid);
    }

    if (e.key === "Tab") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    }

    if (e.key === "ArrowRight") {
      const nc = col + 1;
      if (nc < GRID_SIZE && !PUZZLE.blackCells[row][nc]) setSelectedCell({ row, col: nc });
    }
    if (e.key === "ArrowLeft") {
      const nc = col - 1;
      if (nc >= 0 && !PUZZLE.blackCells[row][nc]) setSelectedCell({ row, col: nc });
    }
    if (e.key === "ArrowDown") {
      const nr = row + 1;
      if (nr < GRID_SIZE && !PUZZLE.blackCells[nr][col]) setSelectedCell({ row: nr, col });
    }
    if (e.key === "ArrowUp") {
      const nr = row - 1;
      if (nr >= 0 && !PUZZLE.blackCells[nr][col]) setSelectedCell({ row: nr, col });
    }
  }, [gameState, selectedCell, playerGrid, direction, checkCompleted]);

  const startGame = useCallback(() => {
    setPlayerGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    setCompletedWords(new Set());
    setScore(0);
    setTimer(0);
    setSelectedCell(null);
    setGameState("playing");
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleKeyPress]);

  useEffect(() => { draw(); }, [draw]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Crossword</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Time: {formatTime(timer)}</span>
        <span className="text-green-400">{completedWords.size}/{PUZZLE.words.length} words</span>
      </div>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL}
        height={GRID_SIZE * CELL}
        className="rounded-lg cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const col = Math.floor((e.clientX - rect.left) / CELL);
          const row = Math.floor((e.clientY - rect.top) / CELL);
          handleCellClick(row, col);
        }}
      />

      {activeClue && gameState === "playing" && (
        <p className="text-blue-300 text-sm">{direction.toUpperCase()}: {activeClue}</p>
      )}

      {gameState === "playing" && (
        <p className="text-gray-400 text-xs">Type letters. Tab to switch direction. Arrows to move. Click cells.</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Fill in all the words in the crossword puzzle.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Puzzle</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Puzzle Complete! 🎉</p>
          <p className="text-white">Score: {score} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">New Puzzle</button>
        </div>
      )}
    </div>
  );
}
