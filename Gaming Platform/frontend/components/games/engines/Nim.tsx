"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const PILE_COUNT = 4;
const CELL = 50;

const generatePiles = () => Array.from({ length: PILE_COUNT }, () => Math.floor(Math.random() * 10) + 1);

export default function Nim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [piles, setPiles] = useState<number[]>([]);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [removeCount, setRemoveCount] = useState(0);
  const [turn, setTurn] = useState<"player" | "computer">("player");
  const [message, setMessage] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "hard">("hard");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const totalWidth = PILE_COUNT * (CELL + 30);
    const startX = (canvas.width - totalWidth) / 2;

    piles.forEach((count, pileIdx) => {
      const px = startX + pileIdx * (CELL + 30);
      ctx.fillStyle = selectedPile === pileIdx ? "#3B82F6" : "#374151";
      ctx.fillRect(px, 20, CELL, canvas.height - 60);
      ctx.strokeStyle = "#6B7280";
      ctx.lineWidth = 2;
      ctx.strokeRect(px, 20, CELL, canvas.height - 60);

      for (let i = 0; i < count; i++) {
        const y = canvas.height - 60 - (i + 1) * 25;
        const isHighlighted = selectedPile === pileIdx && i >= count - removeCount;
        ctx.fillStyle = isHighlighted ? "#EF4444" : "#22C55E";
        ctx.beginPath();
        ctx.arc(px + CELL / 2, y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Pile ${pileIdx + 1}: ${count}`, px + CELL / 2, canvas.height - 15);
    });
  }, [piles, selectedPile, removeCount]);

  const startGame = useCallback(() => {
    setPiles(generatePiles());
    setSelectedPile(null);
    setRemoveCount(0);
    setTurn("player");
    setMessage("Your turn! Select a pile and remove objects.");
    setScore(0);
    setGameState("playing");
  }, []);

  const computerMove = useCallback(() => {
    const newPiles = [...piles];
    const totalXor = newPiles.reduce((xor, p) => xor ^ p, 0);

    if (difficulty === "hard" && totalXor !== 0) {
      for (let i = 0; i < newPiles.length; i++) {
        const target = newPiles[i] ^ totalXor;
        if (target < newPiles[i]) {
          const remove = newPiles[i] - target;
          newPiles[i] = target;
          setPiles(newPiles);
          setMessage(`Computer removed ${remove} from pile ${i + 1}`);
          break;
        }
      }
    } else {
      const nonEmpty = newPiles.map((p, i) => ({ p, i })).filter((x) => x.p > 0);
      if (nonEmpty.length > 0) {
        const pick = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
        const remove = Math.min(pick.p, Math.floor(Math.random() * 3) + 1);
        newPiles[pick.i] -= remove;
        setPiles(newPiles);
        setMessage(`Computer removed ${remove} from pile ${pick.i + 1}`);
      }
    }

    if (newPiles.every((p) => p === 0)) {
      setMessage("Computer takes the last object. You lose!");
      setGameState("gameover");
    } else {
      setTurn("player");
      setMessage("Your turn!");
    }
  }, [piles, difficulty]);

  const playerRemove = useCallback(() => {
    if (selectedPile === null || removeCount <= 0 || turn !== "player") return;
    if (removeCount > piles[selectedPile]) return;
    const newPiles = [...piles];
    newPiles[selectedPile] -= removeCount;
    setPiles(newPiles);
    setMessage(`Removed ${removeCount} from pile ${selectedPile + 1}`);
    setSelectedPile(null);
    setRemoveCount(0);
    if (newPiles.every((p) => p === 0)) {
      setScore((s) => s + 100);
      setMessage("You take the last object. You win!");
      setGameState("gameover");
    } else {
      setTurn("computer");
    }
  }, [selectedPile, removeCount, turn, piles]);

  useEffect(() => {
    if (turn === "computer" && gameState === "playing") {
      const timeout = setTimeout(computerMove, 1000);
      return () => clearTimeout(timeout);
    }
  }, [turn, computerMove, gameState]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
      if (gameState === "playing" && turn === "player") {
        if (e.key >= "1" && e.key <= "4") {
          const idx = parseInt(e.key) - 1;
          if (idx < piles.length && piles[idx] > 0) { setSelectedPile(idx); setRemoveCount(1); }
        }
        if (e.key === "ArrowUp" && selectedPile !== null) setRemoveCount((r) => Math.min(r + 1, piles[selectedPile]));
        if (e.key === "ArrowDown" && selectedPile !== null) setRemoveCount((r) => Math.max(r - 1, 0));
        if (e.key === "Enter" && selectedPile !== null) playerRemove();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, turn, startGame, selectedPile, piles, playerRemove]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Nim</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Turn: {turn === "player" ? "You" : "Computer"}</span>
        <span className="text-blue-400">Difficulty: {difficulty}</span>
      </div>
      <canvas ref={canvasRef} width={420} height={300} className="rounded-lg" />
      {gameState === "playing" && turn === "player" && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {piles.map((count, i) => (
              <button key={i} onClick={() => { setSelectedPile(i); setRemoveCount(1); }} disabled={count === 0}
                className={`px-3 py-2 rounded text-sm font-bold ${selectedPile === i ? "bg-blue-600" : "bg-gray-700"} text-white disabled:opacity-50`}>
                Pile {i + 1}: {count}
              </button>
            ))}
          </div>
          {selectedPile !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Remove:</span>
              <button onClick={() => setRemoveCount(Math.max(1, removeCount - 1))} className="bg-gray-600 px-2 rounded text-white">-</button>
              <span className="text-white font-bold">{removeCount}</span>
              <button onClick={() => setRemoveCount(Math.min(removeCount + 1, piles[selectedPile]))} className="bg-gray-600 px-2 rounded text-white">+</button>
              <button onClick={playerRemove} className="bg-green-600 hover:bg-green-500 px-4 py-1 rounded text-white">Confirm</button>
            </div>
          )}
        </div>
      )}
      <p className={`text-sm font-bold ${message.includes("win") ? "text-green-400" : message.includes("lose") ? "text-red-400" : "text-gray-300"}`}>{message}</p>
      <div className="flex gap-2">
        <button onClick={() => setDifficulty("easy")} className={`px-3 py-1 rounded text-sm ${difficulty === "easy" ? "bg-green-600" : "bg-gray-700"} text-white`}>Easy</button>
        <button onClick={() => setDifficulty("hard")} className={`px-3 py-1 rounded text-sm ${difficulty === "hard" ? "bg-red-600" : "bg-gray-700"} text-white`}>Hard</button>
      </div>
      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Take turns removing objects. The player who takes the last one {difficulty === "hard" ? "loses" : "wins"}!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="text-center">
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
