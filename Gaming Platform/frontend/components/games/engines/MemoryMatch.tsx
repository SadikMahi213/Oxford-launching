"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Card = { id: number; value: string; flipped: boolean; matched: boolean };

const EMOJIS = ["🎮", "🎯", "🎲", "🎸", "🚀", "🌟", "🎨", "🏆", "🎪", "🎭"];

export default function MemoryMatch() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gridSize, setGridSize] = useState<4 | 6>(4);
  const [highScore, setHighScore] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPairs = gridSize === 4 ? 8 : 18;

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const startGame = useCallback(() => {
    const selectedEmojis = shuffleArray(EMOJIS).slice(0, totalPairs);
    const pairs = [...selectedEmojis, ...selectedEmojis].map((value, i) => ({
      id: i,
      value,
      flipped: false,
      matched: false,
    }));
    setCards(shuffleArray(pairs));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, [totalPairs]);

  useEffect(() => {
    if (gameState !== "playing" && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (matches === totalPairs && gameState === "playing") {
      const score = Math.max(300 - moves * 5 - timer * 2, 50);
      if (!highScore || score > highScore) setHighScore(score);
      setGameState("gameover");
    }
  }, [matches, totalPairs, gameState, moves, timer, highScore]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      const cardA = cards[a];
      const cardB = cards[b];

      if (cardA.value === cardB.value) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c
            )
          );
          setMatches((m) => m + 1);
          setFlipped([]);
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === a || c.id === b ? { ...c, flipped: false } : c
            )
          );
          setFlipped([]);
        }, 800);
      }
      setMoves((m) => m + 1);
    }
  }, [flipped, cards]);

  const handleCardClick = (index: number) => {
    if (gameState !== "playing" || flipped.length >= 2) return;
    if (cards[index].flipped || cards[index].matched) return;
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, flipped: true } : c)));
    setFlipped((prev) => [...prev, index]);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Memory Match</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Moves: <span className="text-white font-bold">{moves}</span></span>
        <span className="text-gray-400">Time: <span className="text-white font-bold">{formatTime(timer)}</span></span>
        <span className="text-gray-400">Pairs: <span className="text-green-400 font-bold">{matches}/{totalPairs}</span></span>
      </div>

      {highScore && <p className="text-yellow-400 text-sm">Best Score: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="flex gap-2">
            <button
              onClick={() => setGridSize(4)}
              className={`px-4 py-2 rounded font-medium transition ${
                gridSize === 4 ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              4×4
            </button>
            <button
              onClick={() => setGridSize(6)}
              className={`px-4 py-2 rounded font-medium transition ${
                gridSize === 6 ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              6×6
            </button>
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
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: gridSize === 4 ? "320px" : "480px",
          }}
        >
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(i)}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                card.flipped || card.matched
                  ? card.matched
                    ? "bg-green-900/50 border-2 border-green-500 scale-95"
                    : "bg-blue-900/50 border-2 border-blue-400"
                  : "bg-gray-700 hover:bg-gray-600 border-2 border-gray-600"
              } ${card.matched ? "opacity-70" : ""}`}
              style={{ fontSize: gridSize === 4 ? "1.5rem" : "1.2rem" }}
              disabled={gameState === "gameover"}
            >
              {card.flipped || card.matched ? card.value : "?"}
            </button>
          ))}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-green-400">You Win!</p>
            <p className="text-gray-400 mt-2">Moves: {moves} | Time: {formatTime(timer)}</p>
            <p className="text-yellow-400 font-bold mt-1">Score: {Math.max(300 - moves * 5 - timer * 2, 50)}</p>
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
