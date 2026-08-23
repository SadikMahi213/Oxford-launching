"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function DigitSum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState("");
  const [correctSum, setCorrectSum] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sumDigits = useCallback((n: string): number => {
    return n.split("").reduce((sum, d) => sum + parseInt(d), 0);
  }, []);

  const generatePuzzle = useCallback((lvl: number) => {
    const len = Math.min(lvl + 2, 8);
    let num = "";
    for (let i = 0; i < len; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    const sum = sumDigits(num);

    const wrongOptions: number[] = [];
    while (wrongOptions.length < 3) {
      const w = sum + Math.floor(Math.random() * 15) - 7;
      if (w > 0 && w !== sum && !wrongOptions.includes(w)) {
        wrongOptions.push(w);
      }
    }

    const allOptions = [sum, ...wrongOptions].sort(() => Math.random() - 0.5);
    return { num, sum, options: allOptions };
  }, [sumDigits]);

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
      ctx.fillStyle = "#06B6D4";
      ctx.font = "bold 40px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number, canvas.width / 2, 80);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px sans-serif";
      ctx.fillText("What is the sum of these digits?", canvas.width / 2, 120);

      const btnW = 100;
      const btnH = 55;
      const gap = 15;
      const totalW = options.length * (btnW + gap) - gap;
      const startX = canvas.width / 2 - totalW / 2;

      options.forEach((opt, i) => {
        const x = startX + i * (btnW + gap);
        const y = 160;
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.toString(), x + btnW / 2, y + btnH / 2);
      });

      const timerWidth = 200;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 40;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 10;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);
    }
  }, [gameState, score, level, number, options, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const { num, options } = generatePuzzle(lvl);
    setNumber(num);
    setCorrectSum(sumDigits(num));
    setOptions(options);
    setTimer(Math.max(5, 10 - Math.floor(lvl / 5)));
    setFeedback(null);
    setGameState("playing");
  }, [generatePuzzle, sumDigits]);

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

  const handleOptionClick = useCallback((opt: number) => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (opt === correctSum) {
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
  }, [gameState, correctSum, level, timer, score, startRound]);

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
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) handleOptionClick(options[num - 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, options, startGame, handleOptionClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Digit Sum</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={520}
          height={320}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={() => { if (gameState === "idle" || gameState === "gameover") startGame(); }}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Calculate the sum of all digits quickly!</p>
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
              <p className="text-gray-300">Sum of {number} = <span className="text-white">{correctSum}</span></p>
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
