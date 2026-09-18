"use client";

import { useState, useCallback, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover";

export default function NumberGuess() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [target, setTarget] = useState(0);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<{ g: number; hint: string }[]>([]);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const maxRange = difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : 200;
  const maxAttempts = difficulty === "easy" ? 20 : difficulty === "medium" ? 12 : 8;

  const startGame = useCallback(() => {
    setTarget(Math.floor(Math.random() * maxRange) + 1);
    setGuess("");
    setAttempts(0);
    setFeedback("Make your first guess!");
    setHistory([]);
    setGameState("playing");
  }, [maxRange]);

  const handleGuess = useCallback(() => {
    const num = parseInt(guess);
    if (isNaN(num) || num < 1 || num > maxRange) {
      setFeedback(`Enter a number between 1 and ${maxRange}`);
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (num === target) {
      const score = Math.max(100 - (newAttempts - 1) * 10, 10);
      setFeedback(`Correct! You got it in ${newAttempts} attempts! Score: ${score}`);
      setHistory((prev) => [...prev, { g: num, hint: "CORRECT!" }]);
      if (!highScore || newAttempts < highScore) {
        setHighScore(newAttempts);
      }
      setGameState("gameover");
    } else if (newAttempts >= maxAttempts) {
      setFeedback(`Game Over! The number was ${target}`);
      setHistory((prev) => [...prev, { g: num, hint: num < target ? "Too low" : "Too high" }]);
      setGameState("gameover");
    } else {
      const diff = Math.abs(num - target);
      const rangeHint = difficulty === "easy" ? 20 : difficulty === "medium" ? 10 : 5;
      let proximity = "";
      if (diff <= 3) proximity = "🔥 Burning hot!";
      else if (diff <= rangeHint / 2) proximity = "🌡️ Warm";
      else if (diff <= rangeHint) proximity = "❄️ Cold";
      else proximity = "🧊 Freezing!";

      const hint = num < target ? `Higher ${proximity}` : `Lower ${proximity}`;
      setFeedback(`${hint} (${maxAttempts - newAttempts} attempts left)`);
      setHistory((prev) => [...prev, { g: num, hint }]);
    }

    setGuess("");
  }, [guess, target, attempts, maxAttempts, maxRange, difficulty, highScore]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && gameState === "playing") handleGuess();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleGuess, gameState]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Number Guessing Game</h1>

      <div className="flex gap-2">
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              difficulty === d
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {highScore && (
        <p className="text-yellow-400 text-sm">Best: {highScore} attempts</p>
      )}

      {gameState === "idle" && (
        <button
          onClick={startGame}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
        >
          Start Game
        </button>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-gray-300">
            Guess a number between 1 and {maxRange}
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={maxRange}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Your guess"
              className="px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 w-32 text-center text-lg"
              autoFocus
            />
            <button
              onClick={handleGuess}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-500 transition"
            >
              Guess
            </button>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <button
          onClick={startGame}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
        >
          Play Again
        </button>
      )}

      <div
        className={`p-4 rounded-lg text-center text-lg font-medium min-h-[60px] w-full max-w-md ${
          gameState === "gameover" && feedback.includes("Correct")
            ? "bg-green-900/50 text-green-300 border border-green-700"
            : gameState === "gameover"
            ? "bg-red-900/50 text-red-300 border border-red-700"
            : "bg-gray-800 text-white border border-gray-700"
        }`}
      >
        {feedback}
      </div>

      <div className="w-full max-w-md">
        <h3 className="text-white font-medium mb-2">History</h3>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {history.map((h, i) => (
            <div
              key={i}
              className={`flex justify-between p-2 rounded text-sm ${
                h.hint === "CORRECT!"
                  ? "bg-green-900/50 text-green-300"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              <span>#{i + 1}: {h.g}</span>
              <span>{h.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
