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

function scoreDice(dice: number[]): { farkle: boolean; score: number } {
  const counts = Array(7).fill(0);
  dice.forEach((d) => counts[d]++);

  let score = 0;
  let scoringDice = 0;

  if (counts[1] === 6 || counts[2] === 6 || counts[3] === 6 || counts[4] === 6 || counts[5] === 6 || counts[6] === 6) {
    return { farkle: false, score: 3000 };
  }

  if (counts[1] >= 3) { score += 1000; scoringDice += 3; }
  if (counts[2] >= 3) { score += 200; scoringDice += 3; }
  if (counts[3] >= 3) { score += 300; scoringDice += 3; }
  if (counts[4] >= 3) { score += 400; scoringDice += 3; }
  if (counts[5] >= 3) { score += 500; scoringDice += 3; }
  if (counts[6] >= 3) { score += 600; scoringDice += 3; }

  if (counts[1] > 0 && counts[1] < 3) { score += counts[1] * 100; scoringDice += counts[1]; }
  if (counts[5] > 0 && counts[5] < 3) { score += counts[5] * 50; scoringDice += counts[5]; }

  const straight = [1, 2, 3, 4, 5, 6].every((n) => counts[n] === 1);
  if (straight) return { farkle: false, score: 1500 };

  const threePairs = Object.values(counts).filter((c) => c === 2).length === 3;
  if (threePairs) return { farkle: false, score: 1500 };

  const fourWithPair = Object.values(counts).some((c) => c === 4) && Object.values(counts).some((c) => c === 2);
  if (fourWithPair) return { farkle: false, score: 1500 };

  if (scoringDice === 0) return { farkle: true, score: 0 };

  return { farkle: false, score };
}

export default function Farkle() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [turnScore, setTurnScore] = useState(0);
  const [dice, setDice] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [keptDice, setKeptDice] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedToKeep, setSelectedToKeep] = useState<number[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [roundScore, setRoundScore] = useState(0);

  const startGame = useCallback(() => {
    setPlayerScore(0);
    setCpuScore(0);
    setTurnScore(0);
    setDice([1, 2, 3, 4, 5, 6]);
    setKeptDice([]);
    setSelectedToKeep([]);
    setMessage("Your turn! Roll the dice!");
    setIsPlayerTurn(true);
    setRoundScore(0);
    setGameState("playing");
  }, []);

  const rollDice = useCallback(() => {
    if (rolling) return;
    setRolling(true);

    const remaining = 6 - keptDice.length;
    const newDice = Array.from({ length: remaining }, () => Math.ceil(Math.random() * 6));
    const allDice = [...keptDice, ...newDice];

    setTimeout(() => {
      setDice(allDice);
      setRolling(false);

      const result = scoreDice(allDice);
      if (result.farkle) {
        setTurnScore(0);
        setMessage("FARKLE! No scoring dice!");
        setTimeout(() => {
          setIsPlayerTurn(false);
          cpuTurn();
        }, 1500);
      } else {
        setMessage(`Rolled! Select scoring dice to keep.`);
      }
    }, 800);
  }, [keptDice, rolling]);

  const keepDice = useCallback(() => {
    const result = scoreDice([...keptDice, ...selectedToKeep]);
    const selectedResult = scoreDice(selectedToKeep);

    if (selectedResult.score === 0) {
      setMessage("Selected dice don't score!");
      return;
    }

    const newKept = [...keptDice, ...selectedToKeep];
    setKeptDice(newKept);
    setTurnScore((s) => s + selectedResult.score);
    setSelectedToKeep([]);

    const remaining = 6 - newKept.length;
    if (remaining === 0) {
      setMessage("All dice used! Bonus roll!");
      setKeptDice([]);
    }
  }, [selectedToKeep, keptDice]);

  const bankScore = useCallback(() => {
    const total = turnScore + roundScore;
    setPlayerScore((s) => s + total);
    setTurnScore(0);
    setKeptDice([]);
    setDice([1, 2, 3, 4, 5, 6]);
    setRoundScore(0);
    setMessage(`Banked ${total} points!`);
    setIsPlayerTurn(false);
    setTimeout(() => cpuTurn(), 1000);
  }, [turnScore, roundScore]);

  const cpuTurn = useCallback(() => {
    let cpuKept: number[] = [];
    let cpuTurnScore = 0;
    let rolls = 0;

    const doRoll = () => {
      rolls++;
      const remaining = 6 - cpuKept.length;
      const newDice = Array.from({ length: remaining }, () => Math.ceil(Math.random() * 6));
      const allDice = [...cpuKept, ...newDice];
      const result = scoreDice(allDice);

      if (result.farkle) {
        setMessage("CPU farkled!");
        setTimeout(() => {
          setIsPlayerTurn(true);
          setMessage("Your turn!");
        }, 1000);
        return;
      }

      const scoringDice = allDice.filter((d) => d === 1 || d === 5 || (allDice.filter((x) => x === d).length >= 3));
      cpuKept = [...cpuKept, ...scoringDice.slice(0, Math.ceil(scoringDice.length / 2))];
      cpuTurnScore += result.score;

      if (cpuTurnScore >= 300 || rolls >= 3 || cpuKept.length >= 5) {
        setCpuScore((s) => s + cpuTurnScore);
        setMessage(`CPU banked ${cpuTurnScore} points!`);
        setTimeout(() => {
          setIsPlayerTurn(true);
          setMessage("Your turn!");
        }, 1500);
        return;
      }

      setTimeout(doRoll, 800);
    };

    setTimeout(doRoll, 500);
  }, []);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedToKeep((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Farkle</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Score: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU Score: <span className="text-red-400 font-bold">{cpuScore}</span></span>
        <span className="text-gray-400">Turn: <span className="text-yellow-400 font-bold">{turnScore}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll dice, keep scoring ones & fives, bank before you farkle!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="flex flex-wrap gap-2 justify-center">
            {dice.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleSelect(i)}
                className={`transition transform ${selectedToKeep.includes(i) ? "scale-110 ring-2 ring-yellow-400" : "hover:scale-105"}`}
              >
                {renderDie(60, d)}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={rollDice} disabled={rolling || !isPlayerTurn} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition disabled:opacity-50">
              {rolling ? "Rolling..." : "Roll"}
            </button>
            <button onClick={keepDice} disabled={selectedToKeep.length === 0 || !isPlayerTurn} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold hover:bg-yellow-500 transition disabled:opacity-50">
              Keep
            </button>
            <button onClick={bankScore} disabled={turnScore === 0 || !isPlayerTurn} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-500 transition disabled:opacity-50">
              Bank
            </button>
          </div>
          <p className="text-gray-500 text-xs">Ones = 100 each, Fives = 50 each, Three of a kind = face x 100</p>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {playerScore >= 5000 ? "You Win!" : cpuScore >= 5000 ? "CPU Wins!" : "Game Over!"}
            </p>
            <p className="text-4xl font-bold text-white mt-2">{playerScore}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
