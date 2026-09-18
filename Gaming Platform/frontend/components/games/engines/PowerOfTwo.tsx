"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function PowerOfTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState(0);
  const [isPower, setIsPower] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(8);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkPowerOfTwo = useCallback((n: number): boolean => {
    return n > 0 && (n & (n - 1)) === 0;
  }, []);

  const generatePuzzle = useCallback((lvl: number) => {
    const chance = Math.random();
    if (chance < 0.4) {
      const exp = Math.floor(Math.random() * Math.min(lvl + 3, 15)) + 1;
      return { n: Math.pow(2, exp), isPower: true };
    } else {
      let n: number;
      do {
        n = Math.floor(Math.random() * Math.min(200 + lvl * 50, 2000)) + 2;
      } while (checkPowerOfTwo(n));
      return { n, isPower: false };
    }
  }, [checkPowerOfTwo]);

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
      ctx.fillStyle = "#A855F7";
      ctx.font = "bold 64px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2 - 40);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px sans-serif";
      ctx.fillText("Is this a power of 2?", canvas.width / 2, canvas.height / 2 + 20);

      const btnW = 140;
      const btnH = 55;
      const gap = 30;
      const yesX = canvas.width / 2 - btnW - gap / 2;
      const noX = canvas.width / 2 + gap / 2;
      const btnY = canvas.height / 2 + 50;

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(yesX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Yes (Y)", yesX + btnW / 2, btnY + btnH / 2);

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(noX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#EF4444";
      ctx.fillText("No (N)", noX + btnW / 2, btnY + btnH / 2);

      const timerWidth = 200;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 8;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);
    }
  }, [gameState, score, level, number, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const { n, isPower } = generatePuzzle(lvl);
    setNumber(n);
    setIsPower(isPower);
    setTimer(Math.max(4, 8 - Math.floor(lvl / 5)));
    setFeedback(null);
    setGameState("playing");
  }, [generatePuzzle]);

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

    if (answer === isPower) {
      setFeedback("correct");
      const pts = level * 50 + timer * 5;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 800);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 800);
    }
  }, [gameState, isPower, level, timer, score, startRound]);

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
      if (e.key === "y" || e.key === "Y" || e.key === "ArrowLeft") handleAnswer(true);
      if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") handleAnswer(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleAnswer, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Power of Two</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={350}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={() => { if (gameState === "idle" || gameState === "gameover") startGame(); }}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Quickly identify powers of 2! Press Y/N or click.</p>
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
              <p className="text-gray-300">{number} {isPower ? "IS" : "is NOT"} a power of 2</p>
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
