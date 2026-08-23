"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const BOARD_SIZE = 8;
const CELL = 55;

type PieceColor = "white" | "black" | null;
type Board = (PieceColor)[][];

interface ChessPiece {
  color: "white" | "black";
  type: "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
}

type ChessBoard = (ChessPiece | null)[][];

interface Puzzle {
  board: ChessBoard;
  solution: { row: number; col: number }[];
  description: string;
  side: "white" | "black";
}

const PUZZLES: Puzzle[] = [
  {
    board: (() => {
      const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
      b[7][4] = { color: "white", type: "king" };
      b[0][4] = { color: "black", type: "king" };
      b[6][3] = { color: "white", type: "queen" };
      b[5][5] = { color: "white", type: "rook" };
      return b;
    })(),
    solution: [{ row: 6, col: 3 }],
    description: "White to move - Find the checkmate!",
    side: "white",
  },
  {
    board: (() => {
      const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
      b[7][4] = { color: "white", type: "king" };
      b[0][4] = { color: "black", type: "king" };
      b[0][3] = { color: "white", type: "rook" };
      b[1][5] = { color: "white", type: "rook" };
      return b;
    })(),
    solution: [{ row: 0, col: 3 }],
    description: "White to move - Back rank mate!",
    side: "white",
  },
  {
    board: (() => {
      const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
      b[7][4] = { color: "white", type: "king" };
      b[0][7] = { color: "black", type: "king" };
      b[2][5] = { color: "white", type: "queen" };
      b[3][6] = { color: "white", type: "bishop" };
      return b;
    })(),
    solution: [{ row: 2, col: 5 }],
    description: "White to move - Queen checkmate!",
    side: "white",
  },
];

const PIECE_SYMBOLS: Record<string, string> = {
  king_w: "♔", queen_w: "♕", rook_w: "♖", bishop_w: "♗", knight_w: "♘", pawn_w: "♙",
  king_b: "♚", queen_b: "♛", rook_b: "♜", bishop_b: "♝", knight_b: "♞", pawn_b: "♟",
};

export default function ChessPuzzle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [board, setBoard] = useState<ChessBoard>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || board.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const isLight = (r + c) % 2 === 0;

        if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
          ctx.fillStyle = "#3B82F6";
        } else if (isLight) {
          ctx.fillStyle = "#F0D9B5";
        } else {
          ctx.fillStyle = "#B58863";
        }
        ctx.fillRect(x, y, CELL, CELL);

        const piece = board[r][c];
        if (piece) {
          const key = `${piece.type}_${piece.color[0]}`;
          ctx.fillStyle = piece.color === "white" ? "#fff" : "#000";
          ctx.font = "36px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(PIECE_SYMBOLS[key] || "?", x + CELL / 2, y + CELL / 2);
        }
      }
    }

    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(puzzle.description, BOARD_SIZE * CELL / 2, BOARD_SIZE * CELL + 20);
  }, [board, selectedCell, puzzleIdx]);

  const startGame = useCallback(() => {
    const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];
    setBoard(puzzle.board.map((r) => r.map((c) => (c ? { ...c } : null))));
    setSelectedCell(null);
    setAttempts(0);
    setMessage("");
    setGameState("playing");
  }, [puzzleIdx]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * BOARD_SIZE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * BOARD_SIZE);

    if (row < 0 || row >= 8 || col < 0 || col >= 8) return;

    const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];
    const isCorrect = puzzle.solution.some((s) => s.row === row && s.col === col);

    if (isCorrect) {
      setScore((s) => s + 100);
      setMessage("Correct! Checkmate! 🎉");
      setGameState("gameover");
    } else {
      setAttempts((a) => a + 1);
      setMessage(`Wrong! Try again. (${3 - attempts} attempts left)`);
      if (attempts + 1 >= 3) {
        setMessage(`Out of attempts! Solution highlighted.`);
        puzzle.solution.forEach((s) => {
          setSelectedCell(s);
        });
        setGameState("gameover");
      }
    }
  }, [gameState, puzzleIdx, attempts]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        if (gameState === "gameover") setPuzzleIdx((p) => p + 1);
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Chess Puzzle</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Puzzle: {puzzleIdx + 1}</span>
        <span className="text-red-400">Attempts: {attempts}/3</span>
      </div>

      {board.length > 0 && (
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE * CELL}
          height={BOARD_SIZE * CELL + 30}
          className="rounded-lg cursor-pointer"
          onClick={handleCanvasClick}
        />
      )}

      {message && <p className={`font-bold ${message.includes("Correct") ? "text-green-400" : "text-red-400"}`}>{message}</p>}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Solve chess puzzles - find the winning move!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Puzzles</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-white">Score: {score}</p>
          <button onClick={() => { setPuzzleIdx((p) => p + 1); startGame(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Next Puzzle</button>
        </div>
      )}
    </div>
  );
}
