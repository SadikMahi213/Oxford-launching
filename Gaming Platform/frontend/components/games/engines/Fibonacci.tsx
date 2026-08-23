"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function Fibonacci() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(12);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fibonacci = useCallback((n: number): number[] => {
    const seq = [0, 1];
    for (let i = 2; i < n; i++) {
      seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
  }, []);

  const generatePuzzle = useCallback((lvl: number) => {
    const fib = fibonacci(10 + lvl);
    const showCount = Math.min(lvl + 3, 7);
    const shown = fib.slice(0, showCount);
    const correctNext = fib[showCount];

    const wrongOptions = [
      correctNext + Math.floor(Math.random() * 20) + 5,
      correctNext - Math.floor(Math.random() * 10) - 1,
      correctNext + Math.floor(Math.random() * 30) + 10,
    ].filter(n => n > 0 && n !== correctNext);

    const allOptions = [correctNext, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
    return { shown, next: correctNext, options: allOptions };
  }, [fibonacci]);

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
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      const seqText = sequence.map(n => n.toString()).join("  ");
      ctx.fillText(seqText + "  ?", canvas.width / 2, canvas.height / 2 - 50);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Complete the Fibonacci sequence!", canvas.width / 2, canvas.height / 2 - 20);

      const btnW = 110;
      const btnH = 50;
      const gap = 15;
      const totalW = options.length * (btnW + gap) - gap;
      const startX = canvas.width / 2 - totalW / 2;

      options.forEach((opt, i) => {
        const x = startX + i * (btnW + gap);
        const y = canvas.height / 2 + 10;
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.toString(), x + btnW / 2, y + btnH / 2);
      });

      const timerWidth = 200;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 40;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 12;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);
    }
  }, [gameState, score, level, sequence, options, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const { shown, options } = generatePuzzle(lvl);
    setSequence(shown);
    setOptions(options);
    setTimer(Math.max(5, 12 - Math.floor(lvl / 3)));
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

  const handleOptionClick = useCallback((opt: number) => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const fib = fibonacci(10 + level);
    const correct = fib[sequence.length];

    if (opt === correct) {
      setFeedback("correct");
      const pts = level * 100 + timer * 10;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 800);
    }
  }, [gameState, sequence, level, timer, score, startRound, fibonacci]);

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
      if (num >= 1 && num <= options.length) {
        handleOptionClick(options[num - 1]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, options, startGame, handleOptionClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Fibonacci</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={350}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={() => { if (gameState === "idle" || gameState === "gameover") startGame(); }}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Complete the Fibonacci sequence!</p>
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
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct!</p>
      )}
    </div>
  );
}
