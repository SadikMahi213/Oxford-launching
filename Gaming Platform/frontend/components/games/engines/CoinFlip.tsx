"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";
type FlipResult = "heads" | "tails";

export default function CoinFlip() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [coin, setCoin] = useState<FlipResult>("heads");
  const [flipping, setFlipping] = useState(false);
  const [prediction, setPrediction] = useState<FlipResult | null>(null);
  const [results, setResults] = useState<FlipResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [totalFlips, setTotalFlips] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    setResults([]);
    setStreak(0);
    setScore(0);
    setTotalFlips(0);
    setCorrectGuesses(0);
    setPrediction(null);
    setGameState("playing");
  }, []);

  const flipCoin = useCallback(
    (pred: FlipResult) => {
      if (gameState !== "playing" || flipping) return;

      setPrediction(pred);
      setFlipping(true);

      const result: FlipResult = Math.random() < 0.5 ? "heads" : "tails";

      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = setTimeout(() => {
        setCoin(result);
        setFlipping(false);
        setResults((prev) => [...prev.slice(-19), result]);
        setTotalFlips((t) => t + 1);

        if (pred === result) {
          const newStreak = streak + 1;
          const bonus = newStreak >= 5 ? 5 : newStreak >= 3 ? 3 : 1;
          setScore((s) => s + bonus);
          setStreak(newStreak);
          setCorrectGuesses((c) => c + 1);
          if (newStreak > bestStreak) setBestStreak(newStreak);
        } else {
          setStreak(0);
        }
      }, 1000);
    },
    [gameState, flipping, streak, bestStreak]
  );

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  const accuracy = totalFlips > 0 ? Math.round((correctGuesses / totalFlips) * 100) : 0;
  const headsCount = results.filter((r) => r === "heads").length;
  const tailsCount = results.filter((r) => r === "tails").length;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Coin Flip</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-white font-bold">{score}</span></span>
        <span className="text-gray-400">Streak: <span className="text-orange-400 font-bold">{streak}</span></span>
        <span className="text-gray-400">Best: <span className="text-yellow-400 font-bold">{bestStreak}</span></span>
        <span className="text-gray-400">Accuracy: <span className="text-blue-400 font-bold">{accuracy}%</span></span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Predict heads or tails, then flip! Build streaks for bonus points.
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
        <div className="flex flex-col items-center gap-6">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold transition-all duration-500 ${
              flipping
                ? "bg-yellow-500 animate-spin"
                : coin === "heads"
                ? "bg-yellow-500"
                : "bg-gray-400"
            }`}
            style={{
              transform: flipping ? "rotateY(720deg)" : "rotateY(0deg)",
              transition: "transform 1s ease-out",
            }}
          >
            {flipping ? "🪙" : coin === "heads" ? "👑" : "🦅"}
          </div>

          {!flipping && prediction && (
            <div
              className={`p-3 rounded-lg text-center font-medium ${
                prediction === coin
                  ? "bg-green-900/50 text-green-300 border border-green-700"
                  : "bg-red-900/50 text-red-300 border border-red-700"
              }`}
            >
              {prediction === coin
                ? `Correct! It was ${coin}! +${streak >= 5 ? 5 : streak >= 3 ? 3 : 1}`
                : `Wrong! It was ${coin}`}
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex gap-4">
              <button
                onClick={() => flipCoin("heads")}
                disabled={flipping}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👑 Heads
              </button>
              <button
                onClick={() => flipCoin("tails")}
                disabled={flipping}
                className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🦅 Tails
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-400">Heads: {headsCount}</span>
                <span className="text-red-400">Tails: {tailsCount}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 flex overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${(headsCount / results.length) * 100}%` }}
                />
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${(tailsCount / results.length) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {results.map((r, i) => (
                  <span
                    key={i}
                    className={`text-lg ${r === "heads" ? "" : ""}`}
                  >
                    {r === "heads" ? "👑" : "🦅"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gameState === "gameover" && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-gray-800 rounded-xl text-center">
                <p className="text-4xl font-bold text-white">{score}</p>
                <p className="text-gray-400 mt-1">Final Score</p>
                <p className="text-gray-400">{correctGuesses}/{totalFlips} correct ({accuracy}%)</p>
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
      )}
    </div>
  );
}
