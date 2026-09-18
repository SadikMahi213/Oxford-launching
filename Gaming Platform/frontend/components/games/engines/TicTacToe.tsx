"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";
type Player = "X" | "O" | null;
type Board = Player[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default function TicTacToe() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [score, setScore] = useState({ player: 0, computer: 0, draws: 0 });
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("hard");

  const checkWinner = (b: Board): { winner: Player; line: number[] | null } => {
    for (const line of WINNING_LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], line };
      }
    }
    return { winner: null, line: null };
  };

  const minimax = (b: Board, isMax: number): number => {
    const { winner } = checkWinner(b);
    if (winner === "O") return 10;
    if (winner === "X") return -10;
    if (b.every((c) => c !== null)) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = "O";
          best = Math.max(best, minimax(b, 0));
          b[i] = null;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = "X";
          best = Math.min(best, minimax(b, 1));
          b[i] = null;
        }
      }
      return best;
    }
  };

  const getComputerMove = useCallback(
    (b: Board): number => {
      const empty = b.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
      if (empty.length === 0) return -1;

      if (difficulty === "easy") {
        return empty[Math.floor(Math.random() * empty.length)];
      }

      if (difficulty === "medium" && Math.random() < 0.3) {
        return empty[Math.floor(Math.random() * empty.length)];
      }

      let bestScore = -Infinity;
      let bestMove = empty[0];

      for (const i of empty) {
        b[i] = "O";
        const score = minimax(b, 0);
        b[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
      return bestMove;
    },
    [difficulty]
  );

  const computerPlay = useCallback(
    (currentBoard: Board) => {
      const move = getComputerMove([...currentBoard]);
      if (move === -1) return;

      const newBoard = [...currentBoard];
      newBoard[move] = "O";

      const { winner, line } = checkWinner(newBoard);
      if (winner) {
        setBoard(newBoard);
        setWinLine(line);
        setScore((s) => ({ ...s, computer: s.computer + 1 }));
        setGameState("gameover");
        return;
      }

      if (newBoard.every((c) => c !== null)) {
        setBoard(newBoard);
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        setGameState("gameover");
        return;
      }

      setBoard(newBoard);
      setIsPlayerTurn(true);
    },
    [getComputerMove]
  );

  const startGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinLine(null);
    setGameState("playing");
  }, []);

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameState !== "playing" || !isPlayerTurn || board[index]) return;

      const newBoard = [...board];
      newBoard[index] = "X";

      const { winner, line } = checkWinner(newBoard);
      if (winner) {
        setBoard(newBoard);
        setWinLine(line);
        setScore((s) => ({ ...s, player: s.player + 1 }));
        setGameState("gameover");
        return;
      }

      if (newBoard.every((c) => c !== null)) {
        setBoard(newBoard);
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        setGameState("gameover");
        return;
      }

      setBoard(newBoard);
      setIsPlayerTurn(false);
      setTimeout(() => computerPlay(newBoard), 400);
    },
    [gameState, isPlayerTurn, board, computerPlay]
  );

  const totalGames = score.player + score.computer + score.draws;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Tic Tac Toe</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-green-400">You: {score.player}</span>
        <span className="text-gray-400">Draws: {score.draws}</span>
        <span className="text-red-400">Computer: {score.computer}</span>
        <span className="text-gray-500">Games: {totalGames}</span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-2 rounded font-medium transition ${
                  difficulty === d ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">
            {gameState === "gameover"
              ? winLine
                ? "Game Over!"
                : "Draw!"
              : isPlayerTurn
              ? "Your turn (X)"
              : "Computer thinking..."}
          </p>

          <div className="grid grid-cols-3 gap-2 w-64 h-64">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!!cell || !isPlayerTurn || gameState === "gameover"}
                className={`rounded-lg flex items-center justify-center text-4xl font-bold transition-all ${
                  winLine?.includes(i)
                    ? "bg-green-800 border-2 border-green-400"
                    : cell === "X"
                    ? "bg-blue-900/50 border border-blue-600"
                    : cell === "O"
                    ? "bg-red-900/50 border border-red-600"
                    : "bg-gray-700 hover:bg-gray-600 border border-gray-600"
                } ${cell ? "cursor-default" : "cursor-pointer"}`}
              >
                {cell && (
                  <span className={cell === "X" ? "text-blue-400" : "text-red-400"}>
                    {cell}
                  </span>
                )}
              </button>
            ))}
          </div>

          {gameState === "gameover" && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
