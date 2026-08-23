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

export default function ShipCaptainCrew() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [playerDice, setPlayerDice] = useState<number[]>([]);
  const [cpuDice, setCpuDice] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerRollsLeft, setPlayerRollsLeft] = useState(3);
  const [cpuRollsLeft, setCpuRollsLeft] = useState(3);
  const [playerKept, setPlayerKept] = useState<{ ship: boolean; captain: boolean; crew: boolean }>({ ship: false, captain: false, crew: false });
  const [playerCargo, setPlayerCargo] = useState<number[]>([]);

  const startGame = useCallback(() => {
    setPlayerScore(0);
    setCpuScore(0);
    setPlayerDice([]);
    setCpuDice([]);
    setMessage("Your turn! Roll 5 dice. Get 6=Ship, 5=Captain, 4=Crew first!");
    setIsPlayerTurn(true);
    setPlayerRollsLeft(3);
    setCpuRollsLeft(3);
    setPlayerKept({ ship: false, captain: false, crew: false });
    setPlayerCargo([]);
    setGameState("playing");
  }, []);

  const rollDice = useCallback(() => {
    if (rolling || !isPlayerTurn || playerRollsLeft <= 0) return;
    setRolling(true);
    setPlayerRollsLeft((r) => r - 1);

    setTimeout(() => {
      const dice = Array.from({ length: 5 }, () => Math.ceil(Math.random() * 6));
      setPlayerDice(dice);

      const sorted = [...dice].sort((a, b) => b - a);
      let ship = playerKept.ship;
      let captain = playerKept.captain;
      let crew = playerKept.crew;
      let cargo: number[] = [];
      const used = new Set<number>();

      if (sorted.includes(6)) { ship = true; used.add(dice.indexOf(6)); }
      if (sorted.includes(5)) { captain = true; used.add(dice.indexOf(5)); }
      if (sorted.includes(4)) { crew = true; used.add(dice.indexOf(4)); }

      dice.forEach((d, i) => {
        if (!used.has(i) && d !== 6 && d !== 5 && d !== 4) {
          cargo.push(d);
        }
      });

      setPlayerKept({ ship, captain, crew });
      setPlayerCargo(cargo);

      if (ship && captain && crew) {
        const cargoScore = cargo.reduce((a, b) => a + b, 0);
        setMessage(`You have Ship, Captain, Crew! Cargo: ${cargo.join(", ")} = ${cargoScore} points`);
      } else {
        const missing = [];
        if (!ship) missing.push("Ship(6)");
        if (!captain) missing.push("Captain(5)");
        if (!crew) missing.push("Crew(4)");
        setMessage(`Missing: ${missing.join(", ")}. ${playerRollsLeft - 1} rolls left`);
      }

      setRolling(false);

      if (playerRollsLeft <= 1 || (ship && captain && crew)) {
        if (ship && captain && crew) {
          const cargoScore = cargo.reduce((a, b) => a + b, 0);
          setPlayerScore((s) => s + cargoScore);
        }
        setIsPlayerTurn(false);
        setTimeout(cpuTurn, 1500);
      }
    }, 800);
  }, [rolling, isPlayerTurn, playerRollsLeft, playerKept]);

  const cpuTurn = useCallback(() => {
    let cpuKept = { ship: false, captain: false, crew: false };
    let cpuCargo: number[] = [];
    let rolls = 3;

    const doRoll = () => {
      rolls--;
      const dice = Array.from({ length: 5 }, () => Math.ceil(Math.random() * 6));
      setCpuDice(dice);

      const sorted = [...dice].sort((a, b) => b - a);
      if (sorted.includes(6)) cpuKept.ship = true;
      if (sorted.includes(5)) cpuKept.captain = true;
      if (sorted.includes(4)) cpuKept.crew = true;

      cpuCargo = dice.filter((d) => d !== 6 && d !== 5 && d !== 4);

      if (cpuKept.ship && cpuKept.captain && cpuKept.crew) {
        const score = cpuCargo.reduce((a, b) => a + b, 0);
        setCpuScore((s) => s + score);
        setMessage(`CPU has Ship, Captain, Crew! Cargo: ${cpuCargo.join(", ")} = ${score} points`);
        setTimeout(() => {
          setIsPlayerTurn(true);
          setPlayerKept({ ship: false, captain: false, crew: false });
          setPlayerCargo([]);
          setPlayerRollsLeft(3);
          setMessage("Your turn!");
        }, 2000);
        return;
      }

      if (rolls > 0) {
        setTimeout(doRoll, 800);
      } else {
        setMessage("CPU couldn't complete ship, captain, crew!");
        setTimeout(() => {
          setIsPlayerTurn(true);
          setPlayerKept({ ship: false, captain: false, crew: false });
          setPlayerCargo([]);
          setPlayerRollsLeft(3);
          setMessage("Your turn!");
        }, 2000);
      }
    };

    setTimeout(doRoll, 500);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Ship, Captain & Crew</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Score: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU Score: <span className="text-red-400 font-bold">{cpuScore}</span></span>
        {isPlayerTurn && <span className="text-gray-400">Rolls Left: <span className="text-blue-400 font-bold">{playerRollsLeft}</span></span>}
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll 5 dice. Get 6(Ship), 5(Captain), 4(Crew) first, then score with remaining dice!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="flex gap-1 mb-2">
            {playerDice.length > 0 ? playerDice.map((d, i) => <div key={i}>{renderDie(50, d)}</div>) :
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-[50px] h-[50px] bg-gray-700 rounded" />)}
          </div>
          <div className="flex gap-4 text-sm">
            <span className={playerKept.ship ? "text-green-400" : "text-gray-500"}>Ship(6): {playerKept.ship ? "✓" : "✗"}</span>
            <span className={playerKept.captain ? "text-green-400" : "text-gray-500"}>Captain(5): {playerKept.captain ? "✓" : "✗"}</span>
            <span className={playerKept.crew ? "text-green-400" : "text-gray-500"}>Crew(4): {playerKept.crew ? "✓" : "✗"}</span>
          </div>
          {playerCargo.length > 0 && <p className="text-blue-400 text-sm">Cargo: {playerCargo.join(", ")} = {playerCargo.reduce((a, b) => a + b, 0)}</p>}
          <button onClick={rollDice} disabled={rolling || !isPlayerTurn || playerRollsLeft <= 0} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50">
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
          {cpuDice.length > 0 && (
            <div className="flex gap-1 mt-2">
              <p className="text-gray-500 text-xs mr-2">CPU:</p>
              {cpuDice.map((d, i) => <div key={i}>{renderDie(35, d)}</div>)}
            </div>
          )}
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
