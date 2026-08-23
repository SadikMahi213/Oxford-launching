"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

interface Die {
  value: number;
  rolling: boolean;
}

export default function DiceRoller() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [dice, setDice] = useState<Die[]>([{ value: 1, rolling: false }, { value: 1, rolling: false }]);
  const [diceCount, setDiceCount] = useState(2);
  const [total, setTotal] = useState(2);
  const [rollCount, setRollCount] = useState(0);
  const [target, setTarget] = useState(0);
  const [rollsUntilTarget, setRollsUntilTarget] = useState(0);
  const [history, setHistory] = useState<{ values: number[]; total: number }[]>([]);
  const [statistics, setStatistics] = useState<Record<number, number>>({});
  const [highScore, setHighScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    const t = Math.floor(Math.random() * 30) + 5;
    setTarget(t);
    setDice(Array(diceCount).fill(null).map(() => ({ value: 1, rolling: false })));
    setTotal(diceCount);
    setRollCount(0);
    setRollsUntilTarget(0);
    setHistory([]);
    setStatistics({});
    setRoundScore(0);
    setGameState("playing");
  }, [diceCount]);

  const rollDice = useCallback(() => {
    if (gameState !== "playing") return;

    const newDice = dice.map(() => ({
      value: Math.floor(Math.random() * 6) + 1,
      rolling: true,
    }));
    setDice(newDice);

    if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    rollIntervalRef.current = setTimeout(() => {
      setDice((prev) => prev.map((d) => ({ ...d, rolling: false })));
    }, 500);

    const newTotal = newDice.reduce((sum, d) => sum + d.value, 0);
    const newRollCount = rollCount + 1;
    setTotal(newTotal);
    setRollCount(newRollCount);
    setRollsUntilTarget((r) => r + 1);

    setHistory((prev) => [...prev.slice(-9), { values: newDice.map((d) => d.value), total: newTotal }]);

    setStatistics((prev) => ({
      ...prev,
      [newTotal]: (prev[newTotal] || 0) + 1,
    }));

    if (newTotal === target) {
      const score = Math.max(100 - newRollCount * 5, 10);
      setRoundScore(score);
      if (score > highScore) setHighScore(score);
      setGameState("gameover");
    }
  }, [gameState, dice, rollCount, target, highScore]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault();
        rollDice();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rollDice, gameState]);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    };
  }, []);

  const dieFace = (value: number, rolling: boolean, index: number) => {
    const dots: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };

    return (
      <div
        className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all duration-200 ${
          rolling
            ? "bg-yellow-600 animate-bounce"
            : value === target && gameState === "gameover"
            ? "bg-green-600"
            : "bg-white"
        }`}
      >
        <svg viewBox="0 0 100 100" className="w-16 h-16">
          {(dots[value] || dots[1]).map((pos, i) => (
            <circle
              key={i}
              cx={pos[0]}
              cy={pos[1]}
              r={8}
              fill={rolling ? "white" : "#1F2937"}
            />
          ))}
        </svg>
      </div>
    );
  };

  const maxStatCount = Math.max(...Object.values(statistics), 1);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Dice Roller</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Rolls: <span className="text-white font-bold">{rollCount}</span></span>
        <span className="text-gray-400">Total: <span className="text-blue-400 font-bold">{total}</span></span>
        {gameState === "playing" && (
          <span className="text-gray-400">Target: <span className="text-yellow-400 font-bold">{target}</span></span>
        )}
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best Score: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Dice count:</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setDiceCount(n)}
                className={`w-10 h-10 rounded font-bold transition ${
                  diceCount === n ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm text-center max-w-md">
            Roll the dice and try to hit the target number! Fewer rolls = higher score.
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
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            {dice.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <p className="text-gray-500 text-xs">Die {i + 1}</p>
                {dieFace(d.value, d.rolling, i)}
                <p className="text-white font-bold">{d.value}</p>
              </div>
            ))}
          </div>

          {gameState === "playing" && (
            <button
              onClick={rollDice}
              className="px-8 py-3 bg-yellow-600 text-white rounded-lg font-bold text-lg hover:bg-yellow-500 transition active:scale-95"
            >
              🎲 Roll! (Space)
            </button>
          )}

          {history.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center max-w-md">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    h.total === target ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
                  }`}
                >
                  [{h.values.join(",")}]={h.total}
                </div>
              ))}
            </div>
          )}

          <div className="w-full max-w-md">
            <h3 className="text-white font-medium text-sm mb-2">Distribution</h3>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: diceCount * 6 }, (_, i) => i + diceCount).map((num) => (
                <div key={num} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t ${
                      num === target ? "bg-yellow-500" : "bg-blue-600"
                    }`}
                    style={{
                      height: `${((statistics[num] || 0) / maxStatCount) * 100}%`,
                      minHeight: statistics[num] ? "2px" : "0",
                    }}
                  />
                  <span className="text-[10px] text-gray-500 mt-1">{num}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-green-400">🎯 Hit the Target!</p>
            <p className="text-gray-400 mt-1">Got {target} in {rollCount} rolls</p>
            <p className="text-yellow-400 font-bold mt-1">Score: {roundScore}</p>
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
