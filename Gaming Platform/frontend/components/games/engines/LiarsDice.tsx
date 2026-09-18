"use client";

import React, { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";

function createDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.ceil(Math.random() * 6));
}

function renderDie(size: number, value: number) {
  const dots: React.JSX.Element[] = [];
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

export default function LiarsDice() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerDice, setPlayerDice] = useState<number[]>([6, 6, 6, 6, 6]);
  const [cpuDice, setCpuDice] = useState<number[]>([6, 6, 6, 6, 6]);
  const [playerLives, setPlayerLives] = useState(3);
  const [cpuLives, setCpuLives] = useState(3);
  const [currentBid, setCurrentBid] = useState<{ count: number; face: number } | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState("");
  const [bidCount, setBidCount] = useState(1);
  const [bidFace, setBidFace] = useState(6);
  const [lastAction, setLastAction] = useState("");
  const [showDown, setShowDown] = useState(false);
  const [allDice, setAllDice] = useState<number[]>([]);

  const totalDice = [...playerDice, ...cpuDice].length;

  const startGame = useCallback(() => {
    setPlayerDice(createDice(5));
    setCpuDice(createDice(5));
    setPlayerLives(3);
    setCpuLives(3);
    setCurrentBid(null);
    setIsPlayerTurn(true);
    setMessage("Your turn! Make a bid or call liar!");
    setBidCount(1);
    setBidFace(6);
    setLastAction("");
    setShowDown(false);
    setGameState("playing");
  }, []);

  const cpuBid = useCallback(() => {
    const cpuTotal = cpuDice.length;
    const playerTotal = playerDice.length;
    const counts = Array(7).fill(0);
    cpuDice.forEach((d) => counts[d]++);

    if (currentBid) {
      const maxBid = Math.min(totalDice, currentBid.count + 2);
      const validFaces = Array.from({ length: 6 }, (_, i) => i + 1).filter((f) => f >= currentBid!.face);

      if (Math.random() < 0.25) {
        callLiar();
        return;
      }

      if (validFaces.length > 0) {
        const face = validFaces[Math.floor(Math.random() * validFaces.length)];
        const count = currentBid.count + Math.floor(Math.random() * 2) + 1;
        if (count <= totalDice) {
          setCurrentBid({ count, face });
          setMessage(`CPU bids: ${count}x ${face}s`);
          setIsPlayerTurn(true);
          return;
        }
      }
    }

    const face = Math.ceil(Math.random() * 6);
    const count = Math.min(totalDice, Math.max(1, Math.floor(Math.random() * 3) + 1));
    setCurrentBid({ count, face });
    setMessage(`CPU bids: ${count}x ${face}s`);
    setIsPlayerTurn(true);
  }, [cpuDice, playerDice, currentBid, totalDice]);

  const callLiar = useCallback(() => {
    if (!currentBid) return;
    const allDiceValues = [...playerDice, ...cpuDice];
    setAllDice(allDiceValues);

    const actualCount = allDiceValues.filter((d) => d === currentBid.face).length;
    setShowDown(true);

    if (actualCount >= currentBid.count) {
      setPlayerLives((l) => {
        const newL = l - 1;
        if (newL <= 0) {
          setGameState("gameover");
          setMessage("CPU wins! You ran out of lives!");
        } else {
          setMessage(`Wrong! There were ${actualCount}x ${currentBid.face}s. You lose a life!`);
          setTimeout(() => {
            setPlayerDice(createDice(Math.max(1, playerDice.length - 1)));
            setCurrentBid(null);
            setIsPlayerTurn(true);
            setShowDown(false);
            setMessage("Your turn!");
          }, 2000);
        }
        return newL;
      });
    } else {
      setCpuLives((l) => {
        const newL = l - 1;
        if (newL <= 0) {
          setGameState("gameover");
          setMessage("You Win! CPU ran out of lives!");
        } else {
          setMessage(`Correct! There were only ${actualCount}x ${currentBid.face}s. CPU loses a life!`);
          setTimeout(() => {
            setCpuDice(createDice(Math.max(1, cpuDice.length - 1)));
            setCurrentBid(null);
            setIsPlayerTurn(true);
            setShowDown(false);
            setMessage("Your turn!");
          }, 2000);
        }
        return newL;
      });
    }
  }, [currentBid, playerDice, cpuDice]);

  const makeBid = useCallback(() => {
    if (!isPlayerTurn) return;
    if (currentBid && (bidCount < currentBid.count || (bidCount === currentBid.count && bidFace <= currentBid.face))) {
      setMessage("Bid must be higher than current!");
      return;
    }
    setCurrentBid({ count: bidCount, face: bidFace });
    setMessage(`You bid: ${bidCount}x ${bidFace}s`);
    setIsPlayerTurn(false);
    setTimeout(() => cpuBid(), 1000);
  }, [isPlayerTurn, currentBid, bidCount, bidFace, cpuBid]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Liar's Dice</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Lives: <span className="text-green-400 font-bold">{"❤️".repeat(playerLives)}</span></span>
        <span className="text-gray-400">CPU Lives: <span className="text-red-400 font-bold">{"❤️".repeat(cpuLives)}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {showDown && (
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-gray-400 text-xs mb-1">Your Dice</p>
            <div className="flex gap-1">{playerDice.map((d, i) => <div key={i}>{renderDie(40, d)}</div>)}</div>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-xs mb-1">CPU Dice</p>
            <div className="flex gap-1">{cpuDice.map((d, i) => <div key={i}>{renderDie(40, d)}</div>)}</div>
          </div>
        </div>
      )}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Bluff or call! Bid higher or call liar.</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && !showDown && (
        <>
          <div className="flex gap-1 mb-2">
            {playerDice.map((d, i) => <div key={i}>{renderDie(50, d)}</div>)}
          </div>
          {currentBid && (
            <p className="text-gray-400 text-sm">Current Bid: {currentBid.count}x {currentBid.face}s</p>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-gray-400 text-sm">Count:</label>
            <select value={bidCount} onChange={(e) => setBidCount(Number(e.target.value))} className="bg-gray-700 text-white rounded px-2 py-1">
              {Array.from({ length: totalDice }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <label className="text-gray-400 text-sm">Face:</label>
            <select value={bidFace} onChange={(e) => setBidFace(Number(e.target.value))} className="bg-gray-700 text-white rounded px-2 py-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <button onClick={makeBid} disabled={!isPlayerTurn} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition disabled:opacity-50">Bid</button>
            <button onClick={callLiar} disabled={!isPlayerTurn || !currentBid} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-500 transition disabled:opacity-50">Call Liar!</button>
          </div>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-2xl font-bold ${message.includes("You") ? "text-green-400" : "text-red-400"}`}>{message}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
