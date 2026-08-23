"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const BOARD_SIZE = 8;
const CELL = 55;

type PieceColor = "black" | "white" | null;
type Board = (PieceColor)[][];

const createInitialBoard = (): Board => {
  const board: Board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 !== 0) {
        if (r < 3) board[r][c] = "white";
        if (r > 4) board[r][c] = "black";
      }
    }
  }
  return board;
};

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

const getValidMoves = (board: Board, row: number, col: number): { row: number; col: number; captures: { row: number; col: number }[] }[] => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: { row: number; col: number; captures: { row: number; col: number }[] }[] = [];
  const isKing = piece === "black" ? row === 0 : row === BOARD_SIZE - 1;

  for (const [dr, dc] of DIRS) {
    if (!isKing && piece === "black" && dr > 0) continue;
    if (!isKing && piece === "white" && dr < 0) continue;

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

const hasValidMoves = (board: Board, player: PieceColor): boolean => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === player || (player === "black" && board[r][c] === "black") || (player === "white" && board[r][c] === "white")) {
        if (board[r][c] === player && getValidMoves(board, r, c).length > 0) return true;
      }
    }
  }
  return false;
};

const countPieces = (board: Board): { black: number; white: number } => {
  let black = 0, white = 0;
  board.forEach((row) => row.forEach((cell) => {
    if (cell === "black") black++;
    if (cell === "white") white++;
  }));
  return { black, white };
};

export default function Othello() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = useState<"black" | "white">("black");
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);
  const [selectedMove, setSelectedMove] = useState<{ row: number; col: number } | null>(null);

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
        ctx.fillStyle = (r + c) % 2 === 0 ? "#065F46" : "#047857";
        ctx.fillRect(x, y, CELL, CELL);

        ctx.strokeStyle = "#34D399";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL, CELL);

        if (board[r][c]) {
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 6, 0, Math.PI * 2);
          ctx.fillStyle = board[r][c] === "black" ? "#111827" : "#F9FAFB";
          ctx.fill();
          ctx.strokeStyle = board[r][c] === "black" ? "#374151" : "#D1D5DB";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const isValid = validMoves.some((m) => m.row === r && m.col === c);
        if (isValid) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
          ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        }
      }
    }

    const counts = countPieces(board);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Black: ${counts.black}`, 10, BOARD_SIZE * CELL + 20);
    ctx.textAlign = "right";
    ctx.fillText(`White: ${counts.white}`, BOARD_SIZE * CELL - 10, BOARD_SIZE * CELL + 20);
    ctx.textAlign = "center";
    ctx.fillText(`Turn: ${currentPlayer}`, BOARD_SIZE * CELL / 2, BOARD_SIZE * CELL + 20);
  }, [board, validMoves, currentPlayer]);

  const findFlips = useCallback((board: Board, row: number, col: number, player: "black" | "white"): { row: number; col: number }[] => {
    const opponent = player === "black" ? "white" : "black";
    const flips: { row: number; col: number }[] = [];

    for (const [dr, dc] of DIRS) {
      const lineFlips: { row: number; col: number }[] = [];
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opponent) {
        lineFlips.push({ row: r, col: c });
        r += dr;
        c += dc;
      }
      if (lineFlips.length > 0 && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        flips.push(...lineFlips);
      }
    }

    return flips;
  }, []);

  const makeMove = useCallback((row: number, col: number) => {
    if (gameState !== "playing" || !validMoves.some((m) => m.row === row && m.col === col)) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;

    const flips = findFlips(newBoard, row, col, currentPlayer);
    flips.forEach((f) => { newBoard[f.row][f.col] = currentPlayer; });

    setBoard(newBoard);

    const nextPlayer = currentPlayer === "black" ? "white" : "black";
    const nextMoves: { row: number; col: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!newBoard[r][c] && findFlips(newBoard, r, c, nextPlayer).length > 0) {
          nextMoves.push({ row: r, col: c });
        }
      }
    }

    if (nextMoves.length > 0) {
      setCurrentPlayer(nextPlayer);
      setValidMoves(nextMoves);
    } else {
      const currentMoves: { row: number; col: number }[] = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!newBoard[r][c] && findFlips(newBoard, r, c, currentPlayer).length > 0) {
            currentMoves.push({ row: r, col: c });
          }
        }
      }
      if (currentMoves.length > 0) {
        setValidMoves(currentMoves);
      } else {
        const counts = countPieces(newBoard);
        setScore(Math.max(counts.black, counts.white));
        setGameState("gameover");
      }
    }
  }, [gameState, board, currentPlayer, validMoves, findFlips]);

  const startGame = useCallback(() => {
    const b = createInitialBoard();
    setBoard(b);
    setCurrentPlayer("black");
    const moves: { row: number; col: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!b[r][c] && findFlips(b, r, c, "black").length > 0) {
          moves.push({ row: r, col: c });
        }
      }
    }
    setValidMoves(moves);
    setScore(0);
    setGameState("playing");
  }, [findFlips]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * BOARD_SIZE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * BOARD_SIZE);
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) makeMove(row, col);
  }, [gameState, makeMove]);

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

  const counts = countPieces(board);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Othello</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-300">Black: {counts.black}</span>
        <span className="text-gray-100">White: {counts.white}</span>
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

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Flip your opponent&apos;s pieces by surrounding them. Most pieces wins!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">
            {counts.black > counts.white ? "Black Wins!" : counts.white > counts.black ? "White Wins!" : "Draw!"}
          </p>
          <p className="text-white">Black: {counts.black} | White: {counts.white}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
