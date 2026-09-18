"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function NumberSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [answer, setAnswer] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateSequence = useCallback((lvl: number) => {
    const len = Math.min(lvl + 2, 6);
    const patterns = [
      (i: number) => (i + 1) * 3,
      (i: number) => Math.pow(2, i + 1),
      (i: number) => i * i + 1,
      (i: number) => i * 3 + 5,
      (i: number) => (i + 1) * (i + 2),
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const seq = Array.from({ length: len }, (_, i) => pattern(i));
    const next = pattern(len);
    return { seq, next };
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
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      const seqText = sequence.map(n => n.toString()).join("  ");
      ctx.fillText(seqText + "  ?", canvas.width / 2, canvas.height / 2 - 40);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.fillText("What comes next?", canvas.width / 2, canvas.height / 2);

      const btnW = 120;
      const btnH = 50;
      const startX = canvas.width / 2 - (options.length * (btnW + 15)) / 2;
      options.forEach((opt, i) => {
        const x = startX + i * (btnW + 15);
        const y = canvas.height / 2 + 20;
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = "#60A5FA";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.toString(), x + btnW / 2, y + btnH / 2);
      });

      const timerWidth = 200;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 40;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 15;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);
    }
  }, [gameState, score, level, sequence, options, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const { seq, next } = generateSequence(lvl);
    setSequence(seq);
    setAnswer(next);
    setFeedback(null);
    setTimer(15);

    const wrongOptions = [
      next + Math.floor(Math.random() * 10) - 5,
      next + Math.floor(Math.random() * 10) + 1,
      next - Math.floor(Math.random() * 5) - 1,
    ].filter(n => n !== next && n > 0);
    const allOptions = [next, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setGameState("playing");
  }, [generateSequence]);

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
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const handleOptionClick = useCallback((opt: number) => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (opt === answer) {
      setFeedback("correct");
      const pts = level * 100 + timer * 10;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      if (score > highScore) setHighScore(score);
      setTimeout(() => setGameState("gameover"), 1000);
    }
  }, [gameState, answer, level, timer, score, highScore, startRound]);

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

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const btnW = 120;
    const btnH = 50;
    const startX = canvas.width / 2 - (options.length * (btnW + 15)) / 2;
    const y = canvas.height / 2 + 20;

    options.forEach((opt, i) => {
      const x = startX + i * (btnW + 15);
      if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) {
        handleOptionClick(opt);
      }
    });
  }, [gameState, options, handleOptionClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Number Sequence</h1>
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
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Find the pattern and select the next number!</p>
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
