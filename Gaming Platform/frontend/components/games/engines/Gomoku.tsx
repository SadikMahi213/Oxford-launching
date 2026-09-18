"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const BOARD_SIZE = 15;
const CELL = 28;

type Stone = "black" | "white" | null;
type Board = Stone[][];

const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

const checkWin = (board: Board, row: number, col: number, player: Stone): boolean => {
  if (!player) return false;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
};

const isBoardFull = (board: Board): boolean =>
  board.every((row) => row.every((cell) => cell !== null));

export default function Gomoku() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<"black" | "white">("black");
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [vsAI, setVsAI] = useState(true);
  const [message, setMessage] = useState("");
  const [moveCount, setMoveCount] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = 20;
    const oy = 20;

    ctx.fillStyle = "#D97706";
    ctx.fillRect(ox - 5, oy - 5, BOARD_SIZE * CELL + 10, BOARD_SIZE * CELL + 10);

    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.strokeStyle = "#92400E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox + i * CELL + CELL / 2, oy + CELL / 2);
      ctx.lineTo(ox + i * CELL + CELL / 2, oy + (BOARD_SIZE - 1) * CELL + CELL / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + CELL / 2, oy + i * CELL + CELL / 2);
      ctx.lineTo(ox + (BOARD_SIZE - 1) * CELL + CELL / 2, oy + i * CELL + CELL / 2);
      ctx.stroke();
    }

    const starPoints = [3, 7, 11];
    starPoints.forEach((r) => {
      starPoints.forEach((c) => {
        ctx.fillStyle = "#92400E";
        ctx.beginPath();
        ctx.arc(ox + c * CELL + CELL / 2, oy + r * CELL + CELL / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const x = ox + c * CELL + CELL / 2;
          const y = oy + r * CELL + CELL / 2;
          const radius = CELL / 2 - 3;

          const gradient = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, radius);
          if (cell === "black") {
            gradient.addColorStop(0, "#4B5563");
            gradient.addColorStop(1, "#000");
          } else {
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(1, "#D1D5DB");
          }
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = cell === "black" ? "#000" : "#9CA3AF";
          ctx.lineWidth = 1;
          ctx.stroke();

          if (lastMove && lastMove.row === r && lastMove.col === c) {
            ctx.strokeStyle = "#EF4444";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    });
  }, [board, lastMove]);

  const aiMove = useCallback(() => {
    const scores: { row: number; col: number; score: number }[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== null) continue;
        let hasNeighbor = false;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]) {
              hasNeighbor = true;
              break;
            }
          }
          if (hasNeighbor) break;
        }
        if (!hasNeighbor && moveCount > 0) continue;

        let s = 0;
        for (const [dr, dc] of DIRECTIONS) {
          for (const player of ["white" as Stone, "black" as Stone]) {
            let count = 0;
            for (let i = 1; i <= 4; i++) {
              const nr = r + dr * i;
              const nc = c + dc * i;
              if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) count++;
              else break;
            }
            if (player === "white" && count >= 1) s += count * count * 10;
            if (player === "black" && count >= 1) s += count * count * 8;
          }
        }
        scores.push({ row: r, col: c, score: s + Math.random() * 2 });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 0) {
      const best = scores[0];
      const newBoard = board.map((r) => [...r]);
      newBoard[best.row][best.col] = "white";
      setBoard(newBoard);
      setLastMove({ row: best.row, col: best.col });
      setMoveCount((m) => m + 1);

      if (checkWin(newBoard, best.row, best.col, "white")) {
        setMessage("White wins!");
        setGameState("gameover");
      } else if (isBoardFull(newBoard)) {
        setMessage("Draw!");
        setGameState("gameover");
      } else {
        setCurrentPlayer("black");
      }
    }
  }, [board, moveCount]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || currentPlayer !== "black") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const col = Math.floor((mx - 20) / CELL);
    const row = Math.floor((my - 20) / CELL);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE || board[row][col]) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = "black";
    setBoard(newBoard);
    setLastMove({ row, col });
    setMoveCount((m) => m + 1);

    if (checkWin(newBoard, row, col, "black")) {
      setScore((s) => s + 100);
      setMessage("Black wins!");
      setGameState("gameover");
    } else if (isBoardFull(newBoard)) {
      setMessage("Draw!");
      setGameState("gameover");
    } else if (vsAI) {
      setCurrentPlayer("white");
    } else {
      setCurrentPlayer(currentPlayer === "black" ? "white" : "black");
    }
  }, [gameState, currentPlayer, board, vsAI]);

  useEffect(() => {
    if (vsAI && currentPlayer === "white" && gameState === "playing") {
      const timeout = setTimeout(aiMove, 400);
      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, aiMove, vsAI, gameState]);

  useEffect(() => { draw(); }, [draw]);

  const startGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("black");
    setLastMove(null);
    setMessage("");
    setMoveCount(0);
    setGameState("playing");
  }, []);

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
      <h2 className="text-xl font-bold text-white">Gomoku</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Turn: {currentPlayer}</span>
        <span className="text-blue-400">Mode: {vsAI ? "vs AI" : "2 Player"}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={BOARD_SIZE * CELL + 40}
        height={BOARD_SIZE * CELL + 40}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
      />
      {message && <p className={`font-bold ${message.includes("win") ? "text-green-400" : "text-gray-400"}`}>{message}</p>}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Get 5 in a row to win! Click intersections to place stones.</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setVsAI(true)} className={`px-4 py-2 rounded ${vsAI ? "bg-blue-600" : "bg-gray-700"} text-white`}>vs AI</button>
            <button onClick={() => setVsAI(false)} className={`px-4 py-2 rounded ${!vsAI ? "bg-blue-600" : "bg-gray-700"} text-white`}>2 Player</button>
          </div>
          <button onClick={startGame} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded">Play Again</button>
        </div>
      )}
    </div>
  );
}
