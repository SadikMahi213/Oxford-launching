"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const GRID_ROWS = 12;
const GRID_COLS = 12;
const CELL = 30;

const WORD_LIST = ["REACT", "JAVASCRIPT", "CANVAS", "PYTHON", "GITHUB", "SERVER", "CLIENT", "HTML", "CSS", "TYPESCRIPT", "NODE", "API", "DATABASE", "QUERY", "DEBUG"];

const generateGrid = (words: string[]) => {
  const grid: string[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(""));
  const directions = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]];
  const placedWords: { word: string; positions: { row: number; col: number }[] }[] = [];

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * GRID_ROWS);
      const col = Math.floor(Math.random() * GRID_COLS);
      const positions: { row: number; col: number }[] = [];
      let fits = true;

      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) { fits = false; break; }
        if (grid[r][c] !== "" && grid[r][c] !== word[i]) { fits = false; break; }
        positions.push({ row: r, col: c });
      }

      if (fits) {
        positions.forEach((p, i) => { grid[p.row][p.col] = word[i]; });
        placedWords.push({ word, positions });
        placed = true;
      }
    }
  });

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return { grid, placedWords };
};

export default function WordSearch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placedWords, setPlacedWords] = useState<{ word: string; positions: { row: number; col: number }[] }[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [highlightCells, setHighlightCells] = useState<Map<string, string>>(new Map());

  const CELL_COLORS = ["#22C55E", "#3B82F6", "#F97316", "#8B5CF6", "#EC4899", "#EAB308", "#14B8A6", "#EF4444"];

  const startGame = useCallback(() => {
    const words = WORD_LIST.sort(() => Math.random() - 0.5).slice(0, 8);
    const { grid: g, placedWords: pw } = generateGrid(words);
    setGrid(g);
    setPlacedWords(pw);
    setTargetWords(words);
    setFoundWords(new Set());
    setSelectedCells([]);
    setHighlightCells(new Map());
    setScore(0);
    setGameState("playing");
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const key = `${r},${c}`;
        const hlColor = highlightCells.get(key);
        const isSelected = selectedCells.some((s) => s.row === r && s.col === c);

        ctx.fillStyle = hlColor || isSelected ? "#374151" : (r + c) % 2 === 0 ? "#1F2937" : "#111827";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL, CELL);

        ctx.fillStyle = hlColor ? "#fff" : "#D1D5DB";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(grid[r][c], x + CELL / 2, y + CELL / 2);
      }
    }
  }, [grid, selectedCells, highlightCells]);

  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const col = Math.floor(((clientX - rect.left) / rect.width) * GRID_COLS);
    const row = Math.floor(((clientY - rect.top) / rect.height) * GRID_ROWS);
    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) return { row, col };
    return null;
  }, []);

  const getLineCells = useCallback((start: { row: number; col: number }, end: { row: number; col: number }) => {
    const cells: { row: number; col: number }[] = [];
    const dr = Math.sign(end.row - start.row);
    const dc = Math.sign(end.col - start.col);
    const steps = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col));
    for (let i = 0; i <= steps; i++) {
      cells.push({ row: start.row + dr * i, col: start.col + dc * i });
    }
    return cells;
  }, []);

  const checkSelection = useCallback((cells: { row: number; col: number }[]) => {
    if (cells.length < 2) return;
    const word = cells.map((c) => grid[c.row][c.col]).join("");
    const reverseWord = [...cells].reverse().map((c) => grid[c.row][c.col]).join("");

    let matchedWord = "";
    let matchedPositions: { row: number; col: number }[] = [];

    placedWords.forEach((pw) => {
      if (!foundWords.has(pw.word)) {
        if (pw.word === word || pw.word === reverseWord) {
          matchedWord = pw.word;
          matchedPositions = pw.positions;
        }
      }
    });

    if (matchedWord) {
      setFoundWords((prev) => new Set([...prev, matchedWord]));
      setScore((s) => s + matchedWord.length * 10);

      const colorIdx = foundWords.size % CELL_COLORS.length;
      const newHighlights = new Map(highlightCells);
      matchedPositions.forEach((p) => newHighlights.set(`${p.row},${p.col}`, CELL_COLORS[colorIdx]));
      setHighlightCells(newHighlights);

      if (foundWords.size + 1 === targetWords.length) {
        setGameState("gameover");
      }
    }
  }, [grid, placedWords, foundWords, highlightCells, targetWords]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (!cell || gameState !== "playing") return;
    setIsSelecting(true);
    setStartCell(cell);
    setSelectedCells([cell]);
  }, [getCellFromEvent, gameState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startCell) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    setSelectedCells(getLineCells(startCell, cell));
  }, [isSelecting, startCell, getCellFromEvent, getLineCells]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectedCells.length > 0) {
      checkSelection(selectedCells);
    }
    setIsSelecting(false);
    setStartCell(null);
    setSelectedCells([]);
  }, [isSelecting, selectedCells, checkSelection]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Word Search</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-green-400">{foundWords.size}/{targetWords.length} found</span>
      </div>

      {gameState === "playing" && grid.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          <canvas
            ref={canvasRef}
            width={GRID_COLS * CELL}
            height={GRID_ROWS * CELL}
            className="rounded-lg cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => { e.preventDefault(); const cell = getCellFromEvent(e); if (cell) { setIsSelecting(true); setStartCell(cell); setSelectedCells([cell]); } }}
            onTouchMove={(e) => { e.preventDefault(); if (!isSelecting || !startCell) return; const cell = getCellFromEvent(e); if (cell) setSelectedCells(getLineCells(startCell, cell)); }}
            onTouchEnd={() => { if (isSelecting && selectedCells.length > 0) checkSelection(selectedCells); setIsSelecting(false); setStartCell(null); setSelectedCells([]); }}
          />
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm mb-2">Find these words:</p>
            {targetWords.map((w) => (
              <p key={w} className={`text-sm ${foundWords.has(w) ? "text-green-400 line-through" : "text-white"}`}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Find all hidden words by clicking and dragging across letters.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">All Words Found! 🎉</p>
          <p className="text-white">Score: {score}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
