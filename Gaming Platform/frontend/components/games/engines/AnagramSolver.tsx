"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const ANAGRAMS: { word: string; anagram: string }[] = [
  { word: "listen", anagram: "silent" },
  { word: "earth", anagram: "heart" },
  { word: "night", anagram: "thing" },
  { word: "angel", anagram: "glean" },
  { word: "rat", anagram: "tar" },
  { word: "evil", anagram: "vile" },
  { word: "save", anagram: "vase" },
  { word: "starry", anagram: "ratsry" },
  { word: "cat", anagram: "act" },
  { word: "grow", anagram: "grown" },
  { word: "state", anagram: "taste" },
  { word: "stressed", anagram: "desserts" },
  { word: "dusty", anagram: "study" },
  { word: "bad", anagram: "dab" },
  { word: "elbow", anagram: "below" },
  { word: "cinema", anagram: "iceman" },
  { word: "fatal", anagram: "flat" },
  { word: "maple", anagram: "ample" },
  { word: "real", anagram: "lear" },
  { word: "care", anagram: "race" },
  { word: "trip", anagram: "strip" },
  { word: "post", anagram: "stop" },
  { word: "swap", anagram: "wasp" },
  { word: "cider", anagram: "cried" },
  { word: "night", anagram: "thing" },
];

export default function AnagramSolver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [scrambledWord, setScrambledWord] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(15);
  const [hint, setHint] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scrambleWord = useCallback((word: string): string => {
    const arr = word.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("") === word ? scrambleWord(word) : arr.join("");
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
    ctx.fillText(`Level ${level} | Score: ${score} | Time: ${timer}s`, canvas.width / 2, 25);

    if (gameState === "playing") {
      ctx.fillStyle = "#EC4899";
      ctx.font = "bold 42px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(scrambledWord, canvas.width / 2, 80);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Find the anagram!", canvas.width / 2, 120);

      if (hint) {
        ctx.fillStyle = "#F59E0B";
        ctx.font = "14px monospace";
        ctx.fillText(`Hint: ${hint}`, canvas.width / 2, 145);
      }

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 150, 170, 300, 45, 10);
      ctx.fill();
      ctx.strokeStyle = "#EC4899";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = playerInput ? "#FFFFFF" : "#64748B";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerInput || "Type anagram...", canvas.width / 2, 192);

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 10);
      const ratio = timer / 15;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 10);
    }
  }, [gameState, score, level, scrambledWord, playerInput, hint, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const idx = Math.floor(Math.random() * ANAGRAMS.length);
    const pair = ANAGRAMS[idx];
    setScrambledWord(scrambleWord(pair.word.toUpperCase()));
    setCorrectAnswer(pair.anagram.toLowerCase());
    setPlayerInput("");
    setHint("");
    setTimer(Math.max(8, 15 - Math.floor(lvl / 4)));
    setFeedback(null);
    setGameState("playing");
  }, [scrambleWord]);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    startRound(1);
  }, [startRound]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setFeedback("wrong");
          setHighScore(h => Math.max(h, score));
          setTimeout(() => setGameState("gameover"), 800);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, score]);

  const showHint = useCallback(() => {
    const revealed = correctAnswer.slice(0, 2);
    const hidden = "_".repeat(correctAnswer.length - 2);
    setHint(`${revealed}${hidden}`);
  }, [correctAnswer]);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (playerInput.toLowerCase() === correctAnswer) {
      setFeedback("correct");
      const pts = correctAnswer.length * 30 + timer * 5;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 1000);
    }
  }, [gameState, playerInput, correctAnswer, timer, level, score, startRound]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "playing") return;
      if (e.key === "Enter") handleSubmit();
      else if (e.key === "h" || e.key === "H") showHint();
      else if (e.key === "Backspace") setPlayerInput(p => p.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key)) setPlayerInput(p => p + e.key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleSubmit, showHint]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Anagram Solver</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={300}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Find the anagram of the scrambled word! Press H for hint.</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Game Over!</p>
              <p className="text-gray-300">Answer: <span className="text-white font-mono">{correctAnswer}</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct!</p>
      )}
    </div>
  );
}
