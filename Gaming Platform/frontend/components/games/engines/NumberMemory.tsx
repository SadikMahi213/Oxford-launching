"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";

export default function NumberMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const generateNumber = useCallback((lvl: number) => {
    const len = Math.min(lvl + 2, 12);
    let num = "";
    for (let i = 0; i < len; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    return num;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Level ${level} | Score: ${score}`, canvas.width / 2, 30);

    if (gameState === "showing") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number, canvas.width / 2, canvas.height / 2);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Memorize this number!", canvas.width / 2, canvas.height / 2 + 60);
    } else if (gameState === "input") {
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerInput || "_", canvas.width / 2, canvas.height / 2);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Type the number and press Enter", canvas.width / 2, canvas.height / 2 + 60);

      for (let i = 0; i < number.length; i++) {
        const x = canvas.width / 2 - (number.length * 15) / 2 + i * 15;
        ctx.fillStyle = i < playerInput.length ? "#3B82F6" : "#334155";
        ctx.fillRect(x, canvas.height / 2 + 30, 12, 3);
      }
    } else if (gameState === "gameover" && feedback === "wrong") {
      ctx.fillStyle = "#EF4444";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number, canvas.width / 2, canvas.height / 2);
    }
  }, [gameState, number, playerInput, score, level, feedback]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    clearTimeouts();
    const num = generateNumber(lvl);
    setNumber(num);
    setPlayerInput("");
    setFeedback(null);
    setGameState("showing");

    const showTime = Math.min(1000 + lvl * 300, 5000);
    const t = setTimeout(() => {
      setGameState("input");
    }, showTime);
    timeoutsRef.current.push(t);
  }, [generateNumber, clearTimeouts]);

  const startGame = useCallback(() => {
    clearTimeouts();
    setScore(0);
    setLevel(1);
    setGameState("playing");
    startRound(1);
  }, [startRound, clearTimeouts]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "input") return;

      if (e.key === "Backspace") {
        setPlayerInput(p => p.slice(0, -1));
      } else if (e.key === "Enter") {
        if (playerInput === number) {
          setFeedback("correct");
          const newScore = score + level * 100;
          setScore(newScore);
          const newLevel = level + 1;
          setLevel(newLevel);
          setTimeout(() => startRound(newLevel), 1000);
        } else {
          setFeedback("wrong");
          if (score > highScore) setHighScore(score);
          setTimeout(() => setGameState("gameover"), 1500);
        }
      } else if (/^\d$/.test(e.key)) {
        setPlayerInput(p => p + e.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, playerInput, number, score, level, highScore, startGame, startRound]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Number Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={300}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Remember the number sequence!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Number!</p>
              <p className="text-gray-300">The number was: <span className="text-white font-mono text-xl">{number}</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct! +{level * 100} pts</p>
      )}
    </div>
  );
}
