"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Problem = { text: string; answer: number; options: number[] };

export default function MathBlitz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState<Problem>({ text: "", answer: 0, options: [] });
  const [timer, setTimer] = useState(30);
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const correctCountRef = useRef(0);
  const totalAttemptsRef = useRef(0);

  const generateProblem = useCallback((lvl: number): Problem => {
    const ops = lvl <= 2 ? ["+", "-"] : lvl <= 5 ? ["+", "-", "*"] : ["+", "-", "*", "/"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number, answer: number;

    switch (op) {
      case "+":
        a = Math.floor(Math.random() * (30 + lvl * 15)) + 1;
        b = Math.floor(Math.random() * (30 + lvl * 15)) + 1;
        answer = a + b;
        break;
      case "-":
        a = Math.floor(Math.random() * (50 + lvl * 10)) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
        break;
      case "*":
        a = Math.floor(Math.random() * (5 + lvl * 2)) + 1;
        b = Math.floor(Math.random() * (5 + lvl * 2)) + 1;
        answer = a * b;
        break;
      case "/":
        b = Math.floor(Math.random() * (3 + lvl)) + 2;
        answer = Math.floor(Math.random() * (5 + lvl * 2)) + 1;
        a = b * answer;
        break;
      default:
        a = 1; b = 1; answer = 2;
    }

    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrong = answer + offset;
      if (wrong !== answer && wrong > 0) wrongAnswers.add(wrong);
    }

    const options = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    return { text: `${a} ${op} ${b}`, answer, options };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${score} | Combo: ${combo}x | Level: ${level} | Time: ${timer}s`, canvas.width / 2, 20);

    if (gameState === "playing") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 42px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(problem.text + " = ?", canvas.width / 2, 80);

      if (combo > 1) {
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`${combo}x COMBO!`, canvas.width / 2, 120);
      }

      const btnW = 100;
      const btnH = 55;
      const gap = 15;
      const cols = 2;
      const rows = 2;
      const totalW = cols * (btnW + gap) - gap;
      const totalH = rows * (btnH + gap) - gap;
      const startX = canvas.width / 2 - totalW / 2;
      const startY = 150;

      problem.options.forEach((opt, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (btnW + gap);
        const y = startY + row * (btnH + gap);

        let bgColor = "#334155";
        let borderColor = "#60A5FA";
        if (feedback) {
          if (opt === problem.answer) {
            bgColor = "#22C55E";
            borderColor = "#22C55E";
          }
        }

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.toString(), x + btnW / 2, y + btnH / 2);
      });

      const timerWidth = 300;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 12);
      const ratio = timer / 30;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 12);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Accuracy: ${totalAttemptsRef.current > 0 ? Math.round((correctCountRef.current / totalAttemptsRef.current) * 100) : 100}%`, canvas.width / 2, timerY - 8);
    }
  }, [gameState, score, level, problem, timer, combo, feedback]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setCombo(0);
    setStreak(0);
    setTimer(30);
    correctCountRef.current = 0;
    totalAttemptsRef.current = 0;
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

  const handleOptionClick = useCallback((opt: number) => {
    if (gameState !== "playing" || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    totalAttemptsRef.current++;

    if (opt === problem.answer) {
      correctCountRef.current++;
      const newCombo = combo + 1;
      setCombo(newCombo);
      const pts = level * 10 + newCombo * 5 + timer;
      setScore(s => s + pts);
      setStreak(s => s + 1);

      if (correctCountRef.current % 5 === 0) {
        setLevel(l => l + 1);
      }

      setTimer(t => Math.min(t + 2, 30));
      setFeedback("correct");
      setTimeout(() => {
        setProblem(generateProblem(Math.floor(correctCountRef.current / 5) + 1));
        setFeedback(null);
      }, 300);
    } else {
      setCombo(0);
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 800);
    }
  }, [gameState, problem, combo, level, timer, score, feedback, generateProblem]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || feedback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const btnW = 100;
    const btnH = 55;
    const gap = 15;
    const cols = 2;
    const totalW = cols * (btnW + gap) - gap;
    const startX = canvas.width / 2 - totalW / 2;
    const startY = 150;

    for (let i = 0; i < problem.options.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);
      if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) {
        handleOptionClick(problem.options[i]);
        break;
      }
    }
  }, [gameState, feedback, problem.options, handleOptionClick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "playing" || feedback) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        handleOptionClick(problem.options[num - 1]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, feedback, problem.options, startGame, handleOptionClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Math Blitz</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Combo: <span className="text-orange-400 font-bold">{combo}x</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">Time: <span className="text-yellow-400 font-bold">{timer}s</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={350}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Solve math problems, build combos, earn bonus time!</p>
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
              <p className="text-gray-300">Accuracy: {totalAttemptsRef.current > 0 ? Math.round((correctCountRef.current / totalAttemptsRef.current) * 100) : 0}%</p>
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
