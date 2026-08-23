"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";
type Player = 1 | 2;
type BoardCell = 0 | 1 | 2;
type Board = BoardCell[][];

const ROWS = 6;
const COLS = 7;

export default function ConnectFour() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [board, setBoard] = useState<Board>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0) as BoardCell[])
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [vsComputer, setVsComputer] = useState(true);
  const [hoverCol, setHoverCol] = useState(-1);

  const checkWin = (b: Board, row: number, col: number, player: Player): [number, number][] | null => {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1],
    ];

    for (const [dr, dc] of directions) {
      const cells: [number, number][] = [[row, col]];
      for (let d = 1; d < 4; d++) {
        const r = row + dr * d;
        const c = col + dc * d;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r][c] === player) {
          cells.push([r, c]);
        } else break;
      }
      for (let d = 1; d < 4; d++) {
        const r = row - dr * d;
        const c = col - dc * d;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r][c] === player) {
          cells.push([r, c]);
        } else break;
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  };

  const getAvailableRow = (b: Board, col: number): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) return r;
    }
    return -1;
  };

  const computerMove = useCallback((b: Board) => {
    const board = b.map((r) => [...r]);

    for (let c = 0; c < COLS; c++) {
      const r = getAvailableRow(board, c);
      if (r >= 0) {
        board[r][c] = 2;
        if (checkWin(board, r, c, 2)) return { row: r, col: c };
        board[r][c] = 0;
      }
    }

    for (let c = 0; c < COLS; c++) {
      const r = getAvailableRow(board, c);
      if (r >= 0) {
        board[r][c] = 1;
        if (checkWin(board, r, c, 1)) {
          board[r][c] = 0;
          return { row: r, col: c };
        }
        board[r][c] = 0;
      }
    }

    const centerCols = [3, 2, 4, 1, 5, 0, 6];
    for (const c of centerCols) {
      const r = getAvailableRow(board, c);
      if (r >= 0) return { row: r, col: c };
    }

    return { row: -1, col: -1 };
  }, []);

  const dropDisc = useCallback(
    (col: number) => {
      if (gameState !== "playing") return;

      const row = getAvailableRow(board, col);
      if (row < 0) return;

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = currentPlayer;

      const win = checkWin(newBoard, row, col, currentPlayer);
      if (win) {
        setBoard(newBoard);
        setWinCells(win);
        setScore((s) => ({
          ...s,
          [currentPlayer === 1 ? "p1" : "p2"]: s[currentPlayer === 1 ? "p1" : "p2"] + 1,
        }));
        setGameState("gameover");
        return;
      }

      const isFull = newBoard[0].every((c) => c !== 0);
      if (isFull) {
        setBoard(newBoard);
        setGameState("gameover");
        return;
      }

      setBoard(newBoard);

      if (vsComputer && currentPlayer === 1) {
        setCurrentPlayer(2);
        setTimeout(() => {
          const move = computerMove(newBoard);
          if (move.row >= 0) {
            const finalBoard = newBoard.map((r) => [...r]);
            finalBoard[move.row][move.col] = 2;
            const compWin = checkWin(finalBoard, move.row, move.col, 2);
            if (compWin) {
              setBoard(finalBoard);
              setWinCells(compWin);
              setScore((s) => ({ ...s, p2: s.p2 + 1 }));
              setGameState("gameover");
            } else if (finalBoard[0].every((c) => c !== 0)) {
              setBoard(finalBoard);
              setGameState("gameover");
            } else {
              setBoard(finalBoard);
              setCurrentPlayer(1);
            }
          }
        }, 500);
      } else {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    },
    [board, currentPlayer, gameState, vsComputer, computerMove]
  );

  const startGame = useCallback(() => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0) as BoardCell[]));
    setCurrentPlayer(1);
    setWinCells([]);
    setGameState("playing");
  }, []);

  const winCellSet = new Set(winCells.map(([r, c]) => `${r},${c}`));

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Connect Four</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-blue-400">You: {score.p1}</span>
        <span className="text-red-400">Computer: {score.p2}</span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <div className="flex flex-col items-center gap-2">
          <p className={`text-sm font-medium ${currentPlayer === 1 ? "text-blue-400" : "text-red-400"}`}>
            {gameState === "gameover"
              ? winCells.length > 0
                ? `${currentPlayer === 1 ? "You" : "Computer"} Win!`
                : "Draw!"
              : currentPlayer === 1
              ? "Your turn"
              : "Computer's turn"}
          </p>

          <div className="flex gap-1">
            {Array.from({ length: COLS }).map((_, c) => (
              <div key={c} className="flex flex-col items-center">
                <button
                  onClick={() => dropDisc(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(-1)}
                  disabled={gameState === "gameover" || board[0][c] !== 0 || (vsComputer && currentPlayer === 2)}
                  className={`w-10 h-8 rounded-t flex items-center justify-center transition ${
                    hoverCol === c && board[0][c] === 0 ? "bg-gray-600" : "bg-transparent"
                  }`}
                >
                  {hoverCol === c && board[0][c] === 0 && (
                    <div className={`w-6 h-6 rounded-full ${currentPlayer === 1 ? "bg-blue-500/50" : "bg-red-500/50"}`} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-blue-800 p-2 rounded-xl">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {board.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => dropDisc(c)}
                    disabled={gameState === "gameover" || cell !== 0 || (vsComputer && currentPlayer === 2)}
                    className={`w-10 h-10 rounded-full transition-all ${
                      cell === 0
                        ? "bg-gray-900"
                        : cell === 1
                        ? winCellSet.has(`${r},${c}`)
                          ? "bg-blue-300 scale-110"
                          : "bg-blue-500"
                        : winCellSet.has(`${r},${c}`)
                        ? "bg-red-300 scale-110"
                        : "bg-red-500"
                    }`}
                  />
                ))
              )}
            </div>
          </div>

          {gameState === "gameover" && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition mt-2"
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
