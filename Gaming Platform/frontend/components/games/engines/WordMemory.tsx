"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";

const WORDS = [
  "apple", "brave", "crane", "dream", "eagle", "flame", "grape", "house",
  "input", "joker", "knife", "lemon", "mango", "noble", "ocean", "piano",
  "queen", "river", "stone", "tiger", "ultra", "voice", "water", "xenon",
  "youth", "zebra", "baker", "cloud", "dance", "eager", "frost", "glass",
  "happy", "ivory", "jolly", "kneel", "lunar", "magic", "nerve", "olive",
];

export default function WordMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [word, setWord] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const generateWord = useCallback((lvl: number) => {
    const maxLen = Math.min(3 + Math.floor(lvl / 2), 6);
    const filtered = WORDS.filter(w => w.length <= maxLen);
    return filtered[Math.floor(Math.random() * filtered.length)];
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
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, canvas.width / 2, canvas.height / 2);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Memorize this word!", canvas.width / 2, canvas.height / 2 + 50);
    } else if (gameState === "input") {
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerInput || "_", canvas.width / 2, canvas.height / 2);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Type the word and press Enter", canvas.width / 2, canvas.height / 2 + 50);

      for (let i = 0; i < word.length; i++) {
        const x = canvas.width / 2 - (word.length * 16) / 2 + i * 16;
        ctx.fillStyle = i < playerInput.length ? (playerInput[i] === word[i] ? "#22C55E" : "#EF4444") : "#334155";
        ctx.fillRect(x, canvas.height / 2 + 25, 12, 3);
      }
    }
  }, [gameState, word, playerInput, score, level]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    clearTimeouts();
    const w = generateWord(lvl);
    setWord(w);
    setPlayerInput("");
    setFeedback(null);
    setGameState("showing");

    const showTime = Math.min(1500 + lvl * 200, 4000);
    const t = setTimeout(() => setGameState("input"), showTime);
    timeoutsRef.current.push(t);
  }, [generateWord, clearTimeouts]);

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
        if (playerInput.toLowerCase() === word.toLowerCase()) {
          setFeedback("correct");
          const pts = word.length * 50 + level * 25;
          setScore(s => s + pts);
          const newLevel = level + 1;
          setLevel(newLevel);
          setTimeout(() => startRound(newLevel), 1200);
        } else {
          setFeedback("wrong");
          if (score > highScore) setHighScore(score);
          setTimeout(() => setGameState("gameover"), 1500);
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setPlayerInput(p => p + e.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, playerInput, word, score, level, highScore, startGame, startRound]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Word Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={280}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Remember the word, then type it back!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Word!</p>
              <p className="text-gray-300">The word was: <span className="text-white font-mono text-xl">{word}</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct! +{word.length * 50 + level * 25} pts</p>
      )}
    </div>
  );
}
