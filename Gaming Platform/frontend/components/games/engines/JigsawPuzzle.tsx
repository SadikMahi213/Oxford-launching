"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const GRID_SIZE = 4;
const CELL = 80;

const IMAGES = [
  { color: "#EF4444", label: "Red" },
  { color: "#3B82F6", label: "Blue" },
  { color: "#22C55E", label: "Green" },
  { color: "#EAB308", label: "Yellow" },
  { color: "#8B5CF6", label: "Purple" },
  { color: "#F97316", label: "Orange" },
  { color: "#EC4899", label: "Pink" },
  { color: "#14B8A6", label: "Teal" },
  { color: "#6366F1", label: "Indigo" },
  { color: "#84CC16", label: "Lime" },
  { color: "#F43F5E", label: "Rose" },
  { color: "#06B6D4", label: "Cyan" },
  { color: "#A855F7", label: "Violet" },
  { color: "#D97706", label: "Amber" },
  { color: "#059669", label: "Emerald" },
  { color: "#DC2626", label: "Crimson" },
];

interface PuzzlePiece {
  id: number;
  currentRow: number;
  currentCol: number;
  correctRow: number;
  correctCol: number;
  color: string;
}

const generatePieces = (): PuzzlePiece[] => {
  const pieces: PuzzlePiece[] = [];
  const numPieces = GRID_SIZE * GRID_SIZE;
  const shuffledColors = [...IMAGES].sort(() => Math.random() - 0.5).slice(0, numPieces);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      pieces.push({
        id: idx,
        currentRow: r,
        currentCol: c,
        correctRow: r,
        correctCol: c,
        color: shuffledColors[idx].color,
      });
    }
  }

  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempR = pieces[i].currentRow;
    const tempC = pieces[i].currentCol;
    pieces[i].currentRow = pieces[j].currentRow;
    pieces[i].currentCol = pieces[j].currentCol;
    pieces[j].currentRow = tempR;
    pieces[j].currentCol = tempC;
  }

  return pieces;
};

export default function JigsawPuzzle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const offsetX = (canvas.width - GRID_SIZE * CELL) / 2;
    const offsetY = (canvas.height - GRID_SIZE * CELL) / 2;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX + c * CELL, offsetY + r * CELL, CELL, CELL);

        ctx.fillStyle = "#1F2937";
        ctx.fillRect(offsetX + c * CELL, offsetY + r * CELL, CELL, CELL);
      }
    }

    pieces.forEach((piece) => {
      const x = offsetX + piece.currentCol * CELL + 2;
      const y = offsetY + piece.currentRow * CELL + 2;
      const isCorrect = piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol;
      const isSelected = selectedPiece === piece.id;

      ctx.fillStyle = piece.color;
      ctx.beginPath();
      ctx.roundRect(x, y, CELL - 4, CELL - 4, 8);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (isCorrect) {
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(piece.id + 1), x + (CELL - 4) / 2, y + (CELL - 4) / 2);
    });
  }, [pieces, selectedPiece]);

  const startGame = useCallback(() => {
    const p = generatePieces();
    setPieces(p);
    setSelectedPiece(null);
    setMoves(0);
    setScore(0);
    setTimer(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = (canvas.width - GRID_SIZE * CELL) / 2;
    const offsetY = (canvas.height - GRID_SIZE * CELL) / 2;
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const col = Math.floor((mx - offsetX) / CELL);
    const row = Math.floor((my - offsetY) / CELL);

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    const clickedPiece = pieces.find((p) => p.currentRow === row && p.currentCol === col);

    if (selectedPiece !== null) {
      if (clickedPiece && clickedPiece.id !== selectedPiece) {
        setPieces((prev) => {
          const newPieces = prev.map((p) => ({ ...p }));
          const piece1 = newPieces.find((p) => p.id === selectedPiece)!;
          const piece2 = newPieces.find((p) => p.id === clickedPiece.id)!;
          const tempR = piece1.currentRow;
          const tempC = piece1.currentCol;
          piece1.currentRow = piece2.currentRow;
          piece1.currentCol = piece2.currentCol;
          piece2.currentRow = tempR;
          piece2.currentCol = tempC;
          return newPieces;
        });
        setMoves((m) => m + 1);
        setSelectedPiece(null);
      } else if (clickedPiece) {
        setSelectedPiece(clickedPiece.id);
      } else {
        setSelectedPiece(null);
      }
    } else if (clickedPiece) {
      setSelectedPiece(clickedPiece.id);
    }
  }, [gameState, pieces, selectedPiece]);

  useEffect(() => {
    const allCorrect = pieces.length > 0 && pieces.every((p) => p.currentRow === p.correctRow && p.currentCol === p.correctCol);
    if (allCorrect && gameState === "playing") {
      const bonus = Math.max(0, 1000 - moves * 5 - timer * 2);
      setScore(1000 + bonus);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [pieces, gameState, moves, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Jigsaw Puzzle</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Time: {formatTime(timer)}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL + 40}
        height={GRID_SIZE * CELL + 40}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
      />

      {gameState === "playing" && (
        <p className="text-gray-400 text-sm">Click two pieces to swap them. Arrange by number!</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Swap pieces to arrange them in order. Fewer moves = higher score!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Puzzle</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Puzzle Complete! 🎉</p>
          <p className="text-white">Score: {score} | Moves: {moves} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">New Puzzle</button>
        </div>
      )}
    </div>
  );
}
