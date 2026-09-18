"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const COLS = 8;
const ROWS = 16;
const CELL = 30;

const SHAPES = [
  { shape: [[1, 1], [1, 1]], color: "#EAB308" },
  { shape: [[1, 1, 1, 1]], color: "#06B6D4" },
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

export default function TetrominoStack() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);

  const boardRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const pieceRef = useRef<Piece | null>(null);
  const nextPieceRef = useRef<Piece>(SHAPES[0] as unknown as Piece);
  const scoreRef = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropTimeRef = useRef(800);

  const randomPiece = useCallback((): Piece => {
    const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return { shape: s.shape.map((r) => [...r]), color: s.color, x: Math.floor(COLS / 2) - 1, y: 0 };
  }, []);

  const isValidPosition = useCallback((shape: number[][], x: number, y: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
          if (newY >= 0 && boardRef.current[newY][newX] !== null) return false;
        }
      }
    }
    return true;
  }, []);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const boardY = piece.y + r;
          const boardX = piece.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            boardRef.current[boardY][boardX] = piece.color;
          }
        }
      });
    });

    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (boardRef.current[r].every((cell) => cell !== null)) {
        boardRef.current.splice(r, 1);
        boardRef.current.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || 800;
      scoreRef.current += points * level;
      setScore(scoreRef.current);
      setLines((l) => l + cleared);
    }

    pieceRef.current = nextPieceRef.current;
    nextPieceRef.current = randomPiece();

    if (!isValidPosition(pieceRef.current.shape, pieceRef.current.x, pieceRef.current.y)) {
      setGameState("gameover");
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
    }
  }, [randomPiece, isValidPosition, level, highScore]);

  const movePiece = useCallback((dx: number) => {
    const piece = pieceRef.current;
    if (!piece) return;
    if (isValidPosition(piece.shape, piece.x + dx, piece.y)) {
      piece.x += dx;
    }
  }, [isValidPosition]);

  const rotatePiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    const rotated = piece.shape[0].map((_, c) => piece.shape.map((row) => row[c]).reverse());
    if (isValidPosition(rotated, piece.x, piece.y)) {
      piece.shape = rotated;
    } else if (isValidPosition(rotated, piece.x - 1, piece.y)) {
      piece.shape = rotated;
      piece.x -= 1;
    } else if (isValidPosition(rotated, piece.x + 1, piece.y)) {
      piece.shape = rotated;
      piece.x += 1;
    }
  }, [isValidPosition]);

  const dropPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    if (isValidPosition(piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
    } else {
      lockPiece();
    }
  }, [isValidPosition, lockPiece]);

  const hardDrop = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    while (isValidPosition(piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
      scoreRef.current += 2;
    }
    setScore(scoreRef.current);
    lockPiece();
  }, [isValidPosition, lockPiece]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        if (boardRef.current[r][c]) {
          ctx.fillStyle = boardRef.current[r][c]!;
        } else {
          ctx.fillStyle = "#1F2937";
        }
        ctx.fillRect(x, y, CELL - 1, CELL - 1);
      }
    }

    const piece = pieceRef.current;
    if (piece) {
      piece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillStyle = piece.color;
            ctx.fillRect((piece.x + c) * CELL, (piece.y + r) * CELL, CELL - 1, CELL - 1);
          }
        });
      });
    }

    ctx.fillStyle = "#1F2937";
    ctx.fillRect(COLS * CELL + 10, 10, 120, 80);
    ctx.strokeStyle = "#4B5563";
    ctx.strokeRect(COLS * CELL + 10, 10, 120, 80);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NEXT", COLS * CELL + 70, 28);

    nextPieceRef.current.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = nextPieceRef.current.color;
          ctx.fillRect(COLS * CELL + 30 + c * 18, 38 + r * 18, 16, 16);
        }
      });
    });
  }, []);

  const gameTick = useCallback(() => {
    dropPiece();
    draw();
  }, [dropPiece, draw]);

  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    pieceRef.current = randomPiece();
    nextPieceRef.current = randomPiece();
    scoreRef.current = 0;
    setScore(0);
    setLines(0);
    setLevel(1);
    dropTimeRef.current = 800;
    setGameState("playing");

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(gameTick, dropTimeRef.current);
  }, [randomPiece, gameTick]);

  useEffect(() => {
    if (gameState === "playing" && gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      const newSpeed = Math.max(100, 800 - (level - 1) * 80);
      dropTimeRef.current = newSpeed;
      gameLoopRef.current = setInterval(gameTick, newSpeed);
    }
  }, [level, gameTick, gameState]);

  useEffect(() => {
    const newLevel = Math.floor(lines / 5) + 1;
    setLevel(newLevel);
  }, [lines]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "playing") {
        if (e.key === "ArrowLeft") { movePiece(-1); draw(); }
        if (e.key === "ArrowRight") { movePiece(1); draw(); }
        if (e.key === "ArrowUp") { rotatePiece(); draw(); }
        if (e.key === "ArrowDown") { dropPiece(); draw(); }
        if (e.key === " ") { hardDrop(); draw(); }
        if (e.key === "p" || e.key === "P") {
          setGameState("paused");
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
      } else if (gameState === "paused" && (e.key === "p" || e.key === "P")) {
        setGameState("playing");
        gameLoopRef.current = setInterval(gameTick, dropTimeRef.current);
      } else if (gameState === "idle" || gameState === "gameover") {
        if (e.key === " " || e.key === "Enter") startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, movePiece, rotatePiece, dropPiece, hardDrop, draw, gameTick, startGame]);

  useEffect(() => {
    draw();
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Tetromino Stack</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">High: {highScore}</span>
        <span className="text-blue-400">Level: {level}</span>
        <span className="text-green-400">Lines: {lines}</span>
      </div>
      <canvas ref={canvasRef} width={COLS * CELL + 130} height={ROWS * CELL} className="rounded-lg" />

      {gameState === "playing" && (
        <p className="text-gray-400 text-xs">← → Move | ↑ Rotate | ↓ Soft Drop | Space Hard Drop | P Pause</p>
      )}

      {gameState === "paused" && (
        <p className="text-yellow-400 text-lg font-bold">PAUSED (Press P to resume)</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Stack falling tetrominoes to clear lines!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-red-400 text-lg font-bold">Game Over!</p>
          <p className="text-white">Score: {score} | Lines: {lines}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
