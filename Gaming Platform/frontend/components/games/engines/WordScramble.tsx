"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const WORDS = [
  "apple", "brain", "charm", "dream", "eagle", "flame", "grape", "house",
  "igloo", "joker", "knack", "lemon", "mango", "night", "ocean", "piano",
  "quiet", "river", "storm", "tiger", "ultra", "vivid", "whale", "xenon",
  "yield", "zonal", "beach", "coral", "delta", "ember", "frost", "glide",
  "haste", "ivory", "joust", "kneel", "latch", "merge", "noble", "orbit",
];

export default function WordScramble() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [originalWord, setOriginalWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [hint, setHint] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(20);
  const [hintsUsed, setHintsUsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scramble = useCallback((word: string): string => {
    const arr = word.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const result = arr.join("");
    return result === word ? scramble(word) : result;
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
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(scrambled, canvas.width / 2, 80);

      if (hint) {
        ctx.fillStyle = "#94A3B8";
        ctx.font = "16px monospace";
        ctx.fillText(hint, canvas.width / 2, 120);
      }

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Unscramble the word!", canvas.width / 2, 155);

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 150, 175, 300, 45, 10);
      ctx.fill();
      ctx.strokeStyle = "#60A5FA";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = playerInput ? "#FFFFFF" : "#64748B";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerInput || "Type your answer...", canvas.width / 2, 197);

      ctx.fillStyle = "#3B82F6";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 110, 240, 100, 35, 8);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Hint (H)", canvas.width / 2 - 60, 257);

      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 + 10, 240, 100, 35, 8);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Submit", canvas.width / 2 + 60, 257);

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 10);
      const ratio = timer / 20;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 10);
    }
  }, [gameState, score, level, scrambled, playerInput, hint, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const wordIdx = Math.floor(Math.random() * WORDS.length);
    const word = WORDS[wordIdx];
    setOriginalWord(word);
    setScrambled(scramble(word));
    setPlayerInput("");
    setHint("");
    setHintsUsed(0);
    setTimer(Math.max(10, 20 - Math.floor(lvl / 3)));
    setFeedback(null);
    setGameState("playing");
  }, [scramble]);

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
    if (hintsUsed >= 2) return;
    const revealed = originalWord.slice(0, hintsUsed + 1);
    const hidden = "_ ".repeat(originalWord.length - hintsUsed - 1).trim();
    setHint(`${revealed} ${hidden}`);
    setHintsUsed(h => h + 1);
  }, [originalWord, hintsUsed]);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (playerInput.toLowerCase() === originalWord.toLowerCase()) {
      setFeedback("correct");
      const pts = originalWord.length * 30 + timer * 5 - hintsUsed * 20;
      setScore(s => s + Math.max(pts, 10));
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 1000);
    }
  }, [gameState, playerInput, originalWord, timer, hintsUsed, level, score, startRound]);

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

      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "h" || e.key === "H") {
        showHint();
      } else if (e.key === "Backspace") {
        setPlayerInput(p => p.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setPlayerInput(p => p + e.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleSubmit, showHint]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickX >= canvas.width / 2 - 110 && clickX <= canvas.width / 2 - 10 &&
      clickY >= 240 && clickY <= 275) {
      showHint();
    }
    if (clickX >= canvas.width / 2 + 10 && clickX <= canvas.width / 2 + 110 &&
      clickY >= 240 && clickY <= 275) {
      handleSubmit();
    }
  }, [gameState, showHint, handleSubmit]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Word Scramble</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={320}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Unscramble the letters to form a word!</p>
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
              <p className="text-gray-300">Word was: <span className="text-white font-mono">{originalWord}</span></p>
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
