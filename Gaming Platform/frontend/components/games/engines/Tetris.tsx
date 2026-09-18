"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const COLS = 10;
const ROWS = 20;
const CELL = 24;

const SHAPES = [
  { shape: [[1, 1, 1, 1]], color: "#06B6D4" },
  { shape: [[1, 1], [1, 1]], color: "#EAB308" },
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#8B5CF6" },
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#F97316" },
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#3B82F6" },
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#22C55E" },
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#EF4444" },
];

type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const boardRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const pieceRef = useRef<Piece | null>(null);
  const nextPieceRef = useRef<Piece>(SHAPES[0] as unknown as Piece);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropTimeRef = useRef(800);

  const randomPiece = useCallback((): Piece => {
    const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
      shape: s.shape.map((r) => [...r]),
      color: s.color,
      x: Math.floor(COLS / 2) - Math.ceil(s.shape[0].length / 2),
      y: 0,
    };
  }, []);

  const isValid = useCallback((board: (string | null)[][], piece: Piece): boolean => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const nx = piece.x + c;
          const ny = piece.y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
          if (ny >= 0 && board[ny][nx] !== null) return false;
        }
      }
    }
    return true;
  }, []);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    const board = boardRef.current.map((r) => [...r]);

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const ny = piece.y + r;
          const nx = piece.x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            board[ny][nx] = piece.color;
          }
        }
      }
    }

    let cleared = 0;
    const newBoard = board.filter((row) => {
      if (row.every((cell) => cell !== null)) {
        cleared++;
        return false;
      }
      return true;
    });

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(null));
    }

    boardRef.current = newBoard;

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || 800;
      scoreRef.current += points * levelRef.current;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);
      dropTimeRef.current = Math.max(100, 800 - (levelRef.current - 1) * 70);
    }

    pieceRef.current = nextPieceRef.current;
    nextPieceRef.current = randomPiece();

    if (!isValid(boardRef.current, pieceRef.current)) {
      setGameState("gameover");
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
  }, [isValid, randomPiece, highScore]);

  const rotate = useCallback((shape: number[][]): number[][] => {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];
    for (let c = 0; c < cols; c++) {
      rotated.push([]);
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c].push(shape[r][c]);
      }
    }
    return rotated;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const boardW = COLS * CELL;
    const sidePanel = 120;
    canvas.width = boardW + sidePanel;
    canvas.height = ROWS * CELL;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#1F2937";
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
      }
    }

    boardRef.current.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 4);
        }
      });
    });

    const piece = pieceRef.current;
    if (piece) {
      piece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const px = (piece.x + c) * CELL;
            const py = (piece.y + r) * CELL;
            if (piece.y + r >= 0) {
              ctx.fillStyle = piece.color;
              ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
              ctx.fillStyle = "rgba(255,255,255,0.3)";
              ctx.fillRect(px + 1, py + 1, CELL - 2, 4);
            }
          }
        });
      });
    }

    const next = nextPieceRef.current;
    ctx.fillStyle = "#374151";
    ctx.fillRect(boardW + 10, 10, 100, 80);
    ctx.strokeStyle = "#4B5563";
    ctx.strokeRect(boardW + 10, 10, 100, 80);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NEXT", boardW + 60, 25);

    const nx = boardW + 60 - (next.shape[0].length * 14) / 2;
    const ny = 35;
    next.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = next.color;
          ctx.fillRect(nx + c * 14, ny + r * 14, 12, 12);
        }
      });
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, boardW + 10, 110);
    ctx.fillText(`Lines: ${linesRef.current}`, boardW + 10, 130);
    ctx.fillText(`Level: ${levelRef.current}`, boardW + 10, 150);
  }, []);

  const drop = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    const moved = { ...piece, y: piece.y + 1 };
    if (isValid(boardRef.current, moved)) {
      pieceRef.current = moved;
    } else {
      lockPiece();
    }
    draw();
  }, [isValid, lockPiece, draw]);

  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    dropTimeRef.current = 800;
    setScore(0);
    setLines(0);
    setLevel(1);
    pieceRef.current = randomPiece();
    nextPieceRef.current = randomPiece();
    setGameState("playing");

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(drop, dropTimeRef.current);
  }, [randomPiece, drop]);

  useEffect(() => {
    if (gameState === "playing") {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(drop, dropTimeRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, drop]);

  useEffect(() => {
    draw();
  }, [gameState, draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const piece = pieceRef.current;
      if (!piece) return;

      switch (e.key) {
        case "ArrowLeft":
        case "a": {
          e.preventDefault();
          const moved = { ...piece, x: piece.x - 1 };
          if (isValid(boardRef.current, moved)) pieceRef.current = moved;
          break;
        }
        case "ArrowRight":
        case "d": {
          e.preventDefault();
          const moved = { ...piece, x: piece.x + 1 };
          if (isValid(boardRef.current, moved)) pieceRef.current = moved;
          break;
        }
        case "ArrowDown":
        case "s": {
          e.preventDefault();
          drop();
          break;
        }
        case "ArrowUp":
        case "w": {
          e.preventDefault();
          const rotated = rotate(piece.shape);
          const test = { ...piece, shape: rotated };
          if (isValid(boardRef.current, test)) {
            pieceRef.current = test;
          } else {
            test.x = piece.x - 1;
            if (isValid(boardRef.current, test)) pieceRef.current = test;
            else {
              test.x = piece.x + 1;
              if (isValid(boardRef.current, test)) pieceRef.current = test;
            }
          }
          break;
        }
        case " ": {
          e.preventDefault();
          let sy = piece.y;
          while (isValid(boardRef.current, { ...piece, y: sy + 1 })) sy++;
          pieceRef.current = { ...piece, y: sy };
          lockPiece();
          break;
        }
      }
      draw();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, isValid, rotate, drop, lockPiece, draw]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Tetris</h1>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Arrow keys / WASD to move and rotate. Space for hard drop. Fill lines to score!
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-gray-700"
          style={{ maxWidth: "100%" }}
        />
      )}

      <div className="grid grid-cols-3 gap-4 md:hidden w-full max-w-xs">
        <button onClick={() => {
          if (gameState !== "playing" || !pieceRef.current) return;
          const p = pieceRef.current;
          const moved = { ...p, x: p.x - 1 };
          if (isValid(boardRef.current, moved)) pieceRef.current = moved;
          draw();
        }} className="h-12 bg-gray-700 rounded text-white">←</button>
        <button onClick={() => {
          if (gameState !== "playing" || !pieceRef.current) return;
          const p = pieceRef.current;
          const rotated = rotate(p.shape);
          const test = { ...p, shape: rotated };
          if (isValid(boardRef.current, test)) pieceRef.current = test;
          draw();
        }} className="h-12 bg-gray-700 rounded text-white">↻</button>
        <button onClick={() => {
          if (gameState !== "playing" || !pieceRef.current) return;
          const p = pieceRef.current;
          const moved = { ...p, x: p.x + 1 };
          if (isValid(boardRef.current, moved)) pieceRef.current = moved;
          draw();
        }} className="h-12 bg-gray-700 rounded text-white">→</button>
        <div />
        <button onClick={() => { drop(); }} className="h-12 bg-gray-700 rounded text-white">↓</button>
        <div />
      </div>

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
            <p className="text-gray-400">Level {level} | {lines} lines</p>
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
