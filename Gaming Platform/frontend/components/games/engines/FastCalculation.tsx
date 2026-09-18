"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Problem = { text: string; answer: number };

export default function FastCalculation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState<Problem>({ text: "", answer: 0 });
  const [playerAnswer, setPlayerAnswer] = useState("");
  const [timer, setTimer] = useState(30);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateProblem = useCallback((lvl: number): Problem => {
    const ops = lvl <= 3 ? ["+", "-"] : lvl <= 6 ? ["+", "-", "*"] : ["+", "-", "*", "/"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number, answer: number;

    switch (op) {
      case "+":
        a = Math.floor(Math.random() * (50 + lvl * 10)) + 1;
        b = Math.floor(Math.random() * (50 + lvl * 10)) + 1;
        answer = a + b;
        break;
      case "-":
        a = Math.floor(Math.random() * (50 + lvl * 10)) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
        break;
      case "*":
        a = Math.floor(Math.random() * (10 + lvl * 2)) + 1;
        b = Math.floor(Math.random() * (10 + lvl * 2)) + 1;
        answer = a * b;
        break;
      case "/":
        b = Math.floor(Math.random() * (5 + lvl)) + 1;
        answer = Math.floor(Math.random() * (10 + lvl * 2)) + 1;
        a = b * answer;
        break;
      default:
        a = 1; b = 1; answer = 2;
    }

    return { text: `${a} ${op} ${b}`, answer };
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
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(problem.text + " = ?", canvas.width / 2, canvas.height / 2 - 40);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px monospace";
      ctx.fillText(playerAnswer || "_", canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.fillText("Type your answer and press Enter", canvas.width / 2, canvas.height / 2 + 60);

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 30;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Time: ${timer}s`, canvas.width / 2, timerY - 5);
    }
  }, [gameState, score, level, problem, playerAnswer, timer, streak]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setStreak(0);
    setPlayerAnswer("");
    setTimer(30);
    setProblem(generateProblem(1));
    setGameState("playing");
  }, [generateProblem]);

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

      if (e.key === "Backspace") {
        setPlayerAnswer(p => p.slice(0, -1));
      } else if (e.key === "Enter") {
        const num = parseInt(playerAnswer);
        if (!isNaN(num)) {
          if (num === problem.answer) {
            setScore(s => s + level * 10 + streak * 5);
            setStreak(s => s + 1);
            const newLevel = Math.floor((score + level * 10) / 100) + 1;
            setLevel(newLevel);
            setPlayerAnswer("");
            setProblem(generateProblem(newLevel));
          } else {
            setStreak(0);
            setHighScore(h => Math.max(h, score));
            setGameState("gameover");
          }
        }
      } else if (/^-?\d$/.test(e.key)) {
        setPlayerAnswer(p => p + e.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, playerAnswer, problem, score, level, streak, startGame, generateProblem]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Fast Calculation</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">Streak: <span className="text-yellow-400 font-bold">{streak}</span></span>
        <span className="text-gray-400">Time: <span className="text-red-400 font-bold">{timer}s</span></span>
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
              <p className="text-gray-300 text-sm">Solve math problems as fast as you can!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Time's Up!</p>
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
