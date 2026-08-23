"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";

function renderDie(size: number, value: number) {
  const positions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="inline-block">
      <rect x="5" y="5" width="90" height="90" rx="10" fill="#FFF" stroke="#333" strokeWidth="3" />
      {(positions[value] || []).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#111" />
      ))}
    </svg>
  );
}

export default function Sevens() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [playerDice, setPlayerDice] = useState<number[]>([]);
  const [cpuDice, setCpuDice] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const startGame = useCallback(() => {
    setPlayerScore(0);
    setCpuScore(0);
    setPlayerDice([]);
    setCpuDice([]);
    setRemaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    setMessage("Your turn! Roll 2 dice.");
    setIsPlayerTurn(true);
    setGameState("playing");
  }, []);

  const rollDice = useCallback(() => {
    if (rolling || !isPlayerTurn) return;
    setRolling(true);

    setTimeout(() => {
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      const total = d1 + d2;

      setPlayerDice([d1, d2]);

      if (remaining.includes(total)) {
        setRemaining((prev) => prev.filter((n) => n !== total));
        setPlayerScore((s) => s + total);
        setMessage(`Rolled ${total}! Scored ${total} points!`);

        if (remaining.length <= 1) {
          setGameState("gameover");
          setMessage("Game Over! All numbers taken!");
        }
      } else {
        setMessage(`Rolled ${total} - already taken!`);
      }

      setRolling(false);
      setIsPlayerTurn(false);
      setTimeout(cpuTurn, 1000);
    }, 600);
  }, [rolling, isPlayerTurn, remaining]);

  const cpuTurn = useCallback(() => {
    let rolls = 0;
    const doRoll = () => {
      rolls++;
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      const total = d1 + d2;

      setCpuDice([d1, d2]);

      if (remaining.includes(total)) {
        setRemaining((prev) => prev.filter((n) => n !== total));
        setCpuScore((s) => s + total);
        setMessage(`CPU rolled ${total} and scored ${total}!`);

        if (remaining.length <= 1) {
          setGameState("gameover");
          setMessage("Game Over! All numbers taken!");
          return;
        }
      } else if (rolls < 3) {
        setMessage(`CPU rolled ${total} - taken, re-rolling...`);
        setTimeout(doRoll, 800);
        return;
      } else {
        setMessage(`CPU rolled ${total} - taken, turn over.`);
      }

      setTimeout(() => {
        setIsPlayerTurn(true);
        setMessage("Your turn! Roll 2 dice.");
      }, 1500);
    };

    setTimeout(doRoll, 500);
  }, [remaining]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Sevens</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Score: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU Score: <span className="text-red-400 font-bold">{cpuScore}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll 2 dice and claim the sum before the CPU!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="flex gap-4 mb-2">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">Your Dice</p>
              <div className="flex gap-1">
                {playerDice.length > 0 ? playerDice.map((d, i) => <div key={i}>{renderDie(50, d)}</div>) : <div className="w-[50px] h-[50px] bg-gray-700 rounded" />}
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">CPU Dice</p>
              <div className="flex gap-1">
                {cpuDice.length > 0 ? cpuDice.map((d, i) => <div key={i}>{renderDie(50, d)}</div>) : <div className="w-[50px] h-[50px] bg-gray-700 rounded" />}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {remaining.map((n) => (
              <span key={n} className={`px-3 py-1 rounded text-sm font-bold ${n === 7 ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300"}`}>{n}</span>
            ))}
          </div>
          <button onClick={rollDice} disabled={rolling || !isPlayerTurn} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50">
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-2xl font-bold ${playerScore >= cpuScore ? "text-green-400" : "text-red-400"}`}>
              {playerScore > cpuScore ? "You Win!" : cpuScore > playerScore ? "CPU Wins!" : "It's a Tie!"}
            </p>
            <p className="text-xl text-white mt-2">You: {playerScore} | CPU: {cpuScore}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
