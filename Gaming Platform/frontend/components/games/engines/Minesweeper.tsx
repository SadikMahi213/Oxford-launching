"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover" | "won";

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

type Board = Cell[][];

const EASY = { rows: 8, cols: 8, mines: 10 };
const MEDIUM = { rows: 12, cols: 12, mines: 30 };
const HARD = { rows: 16, cols: 16, mines: 60 };

export default function Minesweeper() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [board, setBoard] = useState<Board>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [timer, setTimer] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [firstClick, setFirstClick] = useState(true);

  const config = difficulty === "easy" ? EASY : difficulty === "medium" ? MEDIUM : HARD;

  const createBoard = useCallback(
    (safeR?: number, safeC?: number): Board => {
      const { rows, cols, mines } = config;
      const board: Board = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
          mine: false,
          revealed: false,
          flagged: false,
          adjacent: 0,
        }))
      );

      let placed = 0;
      while (placed < mines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (!board[r][c].mine && !(r === safeR && c === safeC)) {
          board[r][c].mine = true;
          placed++;
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c].mine) continue;
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
            }
          }
          board[r][c].adjacent = count;
        }
      }
      return board;
    },
    [config]
  );

  const reveal = (b: Board, r: number, c: number): Board => {
    const { rows, cols } = config;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return b;
    if (b[r][c].revealed || b[r][c].flagged) return b;

    const newBoard = b.map((row) => row.map((cell) => ({ ...cell })));
    newBoard[r][c].revealed = true;

    if (newBoard[r][c].adjacent === 0 && !newBoard[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          reveal(newBoard, r + dr, c + dc);
        }
      }
    }
    return newBoard;
  };

  const checkWin = (b: Board): boolean => {
    for (const row of b) {
      for (const cell of row) {
        if (!cell.mine && !cell.revealed) return false;
      }
    }
    return true;
  };

  const startGame = useCallback(() => {
    setBoard(createBoard());
    setTimer(0);
    setFlagCount(0);
    setFirstClick(true);
    setGameState("playing");
  }, [createBoard]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameState !== "playing") return;
      if (board[r]?.[c]?.flagged || board[r]?.[c]?.revealed) return;

      if (firstClick) {
        const newBoard = createBoard(r, c);
        setBoard(newBoard);
        setFirstClick(false);

        const revealed = reveal(newBoard, r, c);
        if (revealed[r][c].mine) {
          revealed.forEach((row) => row.forEach((cell) => { cell.revealed = true; }));
          setBoard(revealed);
          setGameState("gameover");
          return;
        }
        setBoard(revealed);
        if (checkWin(revealed)) {
          setGameState("won");
          if (!highScore || timer < highScore) setHighScore(timer);
        }
        return;
      }

      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
      if (newBoard[r][c].mine) {
        newBoard.forEach((row) => row.forEach((cell) => { cell.revealed = true; }));
        setBoard(newBoard);
        setGameState("gameover");
        return;
      }

      const revealed = reveal(newBoard, r, c);
      setBoard(revealed);
      if (checkWin(revealed)) {
        setGameState("won");
        if (!highScore || timer < highScore) setHighScore(timer);
      }
    },
    [board, gameState, firstClick, createBoard, timer, highScore]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent, r: number, c: number) => {
      e.preventDefault();
      if (gameState !== "playing" || board[r]?.[c]?.revealed) return;

      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
      newBoard[r][c].flagged = !newBoard[r][c].flagged;
      setBoard(newBoard);
      setFlagCount((f) => f + (newBoard[r][c].flagged ? 1 : -1));
    },
    [board, gameState]
  );

  const timerInterval = gameState === "playing" && !firstClick;
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef) clearInterval(timerRef);
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    setTimerRef(id);
  }, []);

  useState(() => {
    if (timerInterval) startTimer();
    else if (timerRef) clearInterval(timerRef);
    return () => { if (timerRef) clearInterval(timerRef); };
  });

  const COLORS: Record<number, string> = {
    1: "text-blue-400",
    2: "text-green-400",
    3: "text-red-400",
    4: "text-purple-400",
    5: "text-yellow-400",
    6: "text-cyan-400",
    7: "text-white",
    8: "text-gray-400",
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Minesweeper</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Mines: <span className="text-red-400 font-bold">{config.mines - flagCount}</span></span>
        <span className="text-gray-400">Time: <span className="text-blue-400 font-bold">{timer}s</span></span>
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
          {highScore && <p className="text-yellow-400 text-sm">Best Time: {highScore}s</p>}
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState !== "idle" && board.length > 0 && (
        <div
          className="grid gap-1 bg-gray-800 p-2 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}
                className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-all ${
                  cell.revealed
                    ? cell.mine
                      ? "bg-red-600 text-white"
                      : "bg-gray-600 text-white"
                    : cell.flagged
                    ? "bg-yellow-500 text-gray-900"
                    : "bg-gray-500 hover:bg-gray-400"
                }`}
              >
                {cell.revealed
                  ? cell.mine
                    ? "💣"
                    : cell.adjacent > 0
                    ? cell.adjacent
                    : ""
                  : cell.flagged
                  ? "🚩"
                  : ""}
              </button>
            ))
          )}
        </div>
      )}

      {(gameState === "won" || gameState === "gameover") && (
        <div className="flex flex-col items-center gap-4">
          <div className={`p-6 rounded-xl text-center ${gameState === "won" ? "bg-green-900/50 border border-green-700" : "bg-red-900/50 border border-red-700"}`}>
            <p className={`text-2xl font-bold ${gameState === "won" ? "text-green-400" : "text-red-400"}`}>
              {gameState === "won" ? "You Win!" : "Game Over!"}
            </p>
            <p className="text-white mt-2">Time: {timer}s</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
