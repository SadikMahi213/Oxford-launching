"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const BOARD_SIZE = 8;
const CELL = 55;

type PieceColor = "red" | "black" | null;
type Board = (PieceColor)[][];

const createInitialBoard = (): Board => {
  const board: Board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 !== 0) {
        if (r < 3) board[r][c] = "black";
        if (r > 4) board[r][c] = "red";
      }
    }
  }
  return board;
};

const DIRS_RED = [[-1, -1], [-1, 1]];
const DIRS_BLACK = [[1, -1], [1, 1]];
const ALL_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

interface Move {
  row: number;
  col: number;
  captures: { row: number; col: number }[];
}

const getValidMoves = (board: Board, row: number, col: number): Move[] => {
  const piece = board[row][col];
  if (!piece) return [];

  const isKing = (piece === "red" && row === 0) || (piece === "black" && row === BOARD_SIZE - 1);
  const dirs = isKing ? ALL_DIRS : (piece === "red" ? DIRS_RED : DIRS_BLACK);

  const moves: Move[] = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      if (!board[nr][nc]) {
        moves.push({ row: nr, col: nc, captures: [] });
      } else if (board[nr][nc] !== piece) {
        const nnr = nr + dr;
        const nnc = nc + dc;
        if (nnr >= 0 && nnr < BOARD_SIZE && nnc >= 0 && nnc < BOARD_SIZE && !board[nnr][nnc]) {
          moves.push({ row: nnr, col: nnc, captures: [{ row: nr, col: nc }] });
        }
      }
    }
  }

  return moves;
};

const getAllMoves = (board: Board, player: PieceColor): Move[] => {
  const allMoves: Move[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === player) {
        allMoves.push(...getValidMoves(board, r, c));
      }
    }
  }
  return allMoves;
};

const countPieces = (board: Board): { red: number; black: number } => {
  let red = 0, black = 0;
  board.forEach((row) => row.forEach((cell) => {
    if (cell === "red") red++;
    if (cell === "black") black++;
  }));
  return { red, black };
};

export default function Checkers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = useState<"red" | "black">("red");
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [message, setMessage] = useState("");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || board.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = c * CELL;
        const y = r * CELL;
        ctx.fillStyle = (r + c) % 2 === 0 ? "#92400E" : "#D97706";
        ctx.fillRect(x, y, CELL, CELL);

        if (selectedPiece && selectedPiece.row === r && selectedPiece.col === c) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
          ctx.fillRect(x, y, CELL, CELL);
        }

        const isValid = validMoves.some((m) => m.row === r && m.col === c);
        if (isValid) {
          ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
          ctx.fillRect(x, y, CELL, CELL);
        }

        if (board[r][c]) {
          const isKing = (board[r][c] === "red" && r === 0) || (board[r][c] === "black" && r === BOARD_SIZE - 1);
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 8, 0, Math.PI * 2);
          ctx.fillStyle = board[r][c] === "red" ? "#DC2626" : "#1F2937";
          ctx.fill();
          ctx.strokeStyle = board[r][c] === "red" ? "#991B1B" : "#111827";
          ctx.lineWidth = 2;
          ctx.stroke();

          if (isKing) {
            ctx.fillStyle = "#FBBF24";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("K", x + CELL / 2, y + CELL / 2);
          }
        }
      }
    }

    const counts = countPieces(board);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Red: ${counts.red} | Black: ${counts.black} | Turn: ${currentPlayer}`, BOARD_SIZE * CELL / 2, BOARD_SIZE * CELL + 20);
  }, [board, selectedPiece, validMoves, currentPlayer]);

  const makeMove = useCallback((fromRow: number, fromCol: number, move: Move) => {
    const newBoard = board.map((r) => [...r]);
    newBoard[move.row][move.col] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;

    move.captures.forEach((cap) => { newBoard[cap.row][cap.col] = null; });

    if (currentPlayer === "red" && move.row === 0) newBoard[move.row][move.col] = "red";
    if (currentPlayer === "black" && move.row === BOARD_SIZE - 1) newBoard[move.row][move.col] = "black";

    setBoard(newBoard);
    setSelectedPiece(null);
    setValidMoves([]);

    const nextPlayer = currentPlayer === "red" ? "black" : "red";
    const nextMoves = getAllMoves(newBoard, nextPlayer);
    if (nextMoves.length === 0) {
      setScore(currentPlayer === "red" ? 1 : 0);
      setMessage(`${currentPlayer} wins!`);
      setGameState("gameover");
    } else {
      setCurrentPlayer(nextPlayer);
    }
  }, [board, currentPlayer]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * BOARD_SIZE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * BOARD_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;

    if (selectedPiece) {
      const move = validMoves.find((m) => m.row === row && m.col === col);
      if (move) {
        makeMove(selectedPiece.row, selectedPiece.col, move);
        return;
      }
    }

    if (board[row][col] === currentPlayer) {
      const moves = getValidMoves(board, row, col);
      if (moves.length > 0) {
        setSelectedPiece({ row, col });
        setValidMoves(moves);
      }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [gameState, board, currentPlayer, selectedPiece, validMoves, makeMove]);

  const startGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer("red");
    setSelectedPiece(null);
    setValidMoves([]);
    setMessage("");
    setScore(0);
    setGameState("playing");
  }, []);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Checkers</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-red-400">Red: {countPieces(board).red}</span>
        <span className="text-gray-300">Black: {countPieces(board).black}</span>
        <span className="text-blue-400">Turn: {currentPlayer}</span>
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

      {message && <p className="text-green-400 font-bold">{message}</p>}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Move your pieces diagonally. Jump over opponents to capture. Reach the other side for a King!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">{message}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
