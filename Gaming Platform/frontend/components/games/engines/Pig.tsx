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

export default function Pig() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [turnTotal, setTurnTotal] = useState(0);
  const [currentDie, setCurrentDie] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const startGame = useCallback(() => {
    setPlayerScore(0);
    setCpuScore(0);
    setTurnTotal(0);
    setCurrentDie(1);
    setMessage("Your turn! Roll the die!");
    setIsPlayerTurn(true);
    setGameState("playing");
  }, []);

  const rollDie = useCallback(() => {
    if (rolling || !isPlayerTurn) return;
    setRolling(true);

    setTimeout(() => {
      const value = Math.ceil(Math.random() * 6);
      setCurrentDie(value);
      setRolling(false);

      if (value === 1) {
        setTurnTotal(0);
        setMessage("Rolled a 1! Turn over, no points!");
        setIsPlayerTurn(false);
        setTimeout(cpuTurn, 1500);
      } else {
        setTurnTotal((t) => t + value);
        setMessage(`Rolled ${value}! Keep rolling or hold?`);
      }
    }, 600);
  }, [rolling, isPlayerTurn]);

  const hold = useCallback(() => {
    if (!isPlayerTurn || turnTotal === 0) return;
    setPlayerScore((s) => {
      const newScore = s + turnTotal;
      if (newScore >= 100) {
        setGameState("gameover");
        setMessage("You Win!");
      }
      return newScore;
    });
    setTurnTotal(0);
    setIsPlayerTurn(false);
    setMessage(`Held! +${turnTotal} points!`);
    setTimeout(cpuTurn, 1500);
  }, [isPlayerTurn, turnTotal]);

  const cpuTurn = useCallback(() => {
    let cpuTurnScore = 0;
    let rolls = 0;

    const doRoll = () => {
      rolls++;
      const value = Math.ceil(Math.random() * 6);

      if (value === 1) {
        setMessage(`CPU rolled a 1! Turn over.`);
        setIsPlayerTurn(true);
        setTimeout(() => setMessage("Your turn!"), 1000);
        return;
      }

      cpuTurnScore += value;

      if (cpuTurnScore >= 20 || (cpuTurnScore + cpuScore >= 100) || (rolls >= 3 && Math.random() < 0.6)) {
        setCpuScore((s) => {
          const newScore = s + cpuTurnScore;
          if (newScore >= 100) {
            setGameState("gameover");
            setMessage("CPU Wins!");
          }
          return newScore;
        });
        setMessage(`CPU held! +${cpuTurnScore} points!`);
        setTimeout(() => {
          setIsPlayerTurn(true);
          setMessage("Your turn!");
        }, 1500);
        return;
      }

      setTimeout(doRoll, 800);
    };

    setTimeout(doRoll, 500);
  }, [cpuScore]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Pig Dice</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Score: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU Score: <span className="text-red-400 font-bold">{cpuScore}</span></span>
        <span className="text-gray-400">Turn Total: <span className="text-yellow-400 font-bold">{turnTotal}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll to add points, but roll a 1 and lose your turn!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="my-4">
            {renderDie(120, currentDie)}
          </div>
          <div className="flex gap-4">
            <button onClick={rollDie} disabled={rolling || !isPlayerTurn} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50">
              {rolling ? "Rolling..." : "Roll"}
            </button>
            <button onClick={hold} disabled={!isPlayerTurn || turnTotal === 0} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition disabled:opacity-50">
              Hold
            </button>
          </div>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-2xl font-bold ${message.includes("You") ? "text-green-400" : "text-red-400"}`}>{message}</p>
            <p className="text-xl text-white mt-2">You: {playerScore} | CPU: {cpuScore}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
