"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export default function PrimeFinder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState(0);
  const [timer, setTimer] = useState(10);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateNumber = useCallback((lvl: number) => {
    const max = 20 + lvl * 15;
    let n: number;
    do {
      n = Math.floor(Math.random() * max) + 2;
    } while (false);
    return n;
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
    ctx.fillText(`Level ${level} | Score: ${score} | Streak: ${streak}`, canvas.width / 2, 25);

    if (gameState === "playing") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 64px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px sans-serif";
      ctx.fillText("Is this a prime number?", canvas.width / 2, canvas.height / 2 + 30);

      const btnW = 140;
      const btnH = 55;
      const gap = 30;
      const primeX = canvas.width / 2 - btnW - gap / 2;
      const compX = canvas.width / 2 + gap / 2;
      const btnY = canvas.height / 2 + 60;

      ctx.fillStyle = feedback === "correct" && isPrime(number) ? "#22C55E" : "#334155";
      ctx.beginPath();
      ctx.roundRect(primeX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Prime", primeX + btnW / 2, btnY + btnH / 2);

      ctx.fillStyle = feedback === "wrong" || (feedback === "correct" && !isPrime(number)) ? "#EF4444" : "#334155";
      ctx.beginPath();
      ctx.roundRect(compX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Not Prime", compX + btnW / 2, btnY + btnH / 2);

      const timerWidth = 200;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 40;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 10;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);
    }
  }, [gameState, score, level, number, timer, feedback, streak]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    setNumber(generateNumber(lvl));
    setTimer(Math.max(5, 10 - Math.floor(lvl / 5)));
    setFeedback(null);
    setGameState("playing");
  }, [generateNumber]);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setStreak(0);
    startRound(1);
  }, [startRound]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setGameState("gameover");
          setHighScore(h => Math.max(h, score));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, score]);

  const handleAnswer = useCallback((answer: boolean) => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = isPrime(number) === answer;
    setFeedback(correct ? "correct" : "wrong");
    if (correct) {
      const pts = level * 50 + timer * 5 + streak * 20;
      setScore(s => s + pts);
      setStreak(s => s + 1);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 800);
    } else {
      setStreak(0);
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 800);
    }
  }, [gameState, number, level, timer, streak, score, startRound]);

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
      if (e.key === "1" || e.key === "ArrowLeft") handleAnswer(true);
      if (e.key === "2" || e.key === "ArrowRight") handleAnswer(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleAnswer, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Prime Finder</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">Streak: <span className="text-yellow-400 font-bold">{streak}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={380}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={() => { if (gameState === "idle" || gameState === "gameover") startGame(); }}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Quickly decide if each number is prime!</p>
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
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
