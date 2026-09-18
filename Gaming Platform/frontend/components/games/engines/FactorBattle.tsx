"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

export default function FactorBattle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState(0);
  const [factors, setFactors] = useState<number[]>([]);
  const [clickedFactors, setClickedFactors] = useState<Set<number>>(new Set());
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const getFactors = useCallback((n: number): number[] => {
    const facts: number[] = [];
    for (let i = 1; i <= n; i++) {
      if (n % i === 0) facts.push(i);
    }
    return facts;
  }, []);

  const generatePuzzle = useCallback((lvl: number) => {
    const maxN = 20 + lvl * 10;
    let n: number;
    let facts: number[];
    do {
      n = Math.floor(Math.random() * maxN) + 6;
      facts = getFactors(n);
    } while (facts.length < 3 || facts.length > 8);

    const wrongNums: number[] = [];
    while (wrongNums.length < 4) {
      const w = Math.floor(Math.random() * maxN) + 1;
      if (!facts.includes(w) && w !== n && !wrongNums.includes(w)) {
        wrongNums.push(w);
      }
    }

    const allOptions = [...facts, ...wrongNums].sort(() => Math.random() - 0.5);
    return { n, facts, options: allOptions };
  }, [getFactors]);

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
    ctx.fillText(`Level ${level} | Score: ${score} | Found: ${clickedFactors.size}/${factors.length}`, canvas.width / 2, 25);

    if (gameState === "playing") {
      ctx.fillStyle = "#A855F7";
      ctx.font = "bold 56px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number.toString(), canvas.width / 2, 80);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Find ALL factors of this number", canvas.width / 2, 120);

      const cols = 4;
      const btnW = 80;
      const btnH = 55;
      const gap = 12;
      const totalW = cols * (btnW + gap) - gap;
      const startX = canvas.width / 2 - totalW / 2;

      options.forEach((opt, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (btnW + gap);
        const y = 150 + row * (btnH + gap);

        const isClicked = clickedFactors.has(opt);
        const isFactor = factors.includes(opt);

        ctx.fillStyle = isClicked ? (isFactor ? "#22C55E" : "#EF4444") : "#334155";
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = isClicked ? (isFactor ? "#22C55E" : "#EF4444") : "#60A5FA";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.toString(), x + btnW / 2, y + btnH / 2);
      });

      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Click "Submit" when you've found all factors`, canvas.width / 2, canvas.height - 50);

      ctx.fillStyle = clickedFactors.size === factors.length ? "#22C55E" : "#3B82F6";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 60, canvas.height - 35, 120, 35, 8);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Submit", canvas.width / 2, canvas.height - 17);
    }
  }, [gameState, score, level, number, factors, clickedFactors, options]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const { n, facts, options } = generatePuzzle(lvl);
    setNumber(n);
    setFactors(facts);
    setClickedFactors(new Set());
    setOptions(options);
    setFeedback(null);
    setGameState("playing");
  }, [generatePuzzle]);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    startRound(1);
  }, [startRound]);

  const handleOptionClick = useCallback((opt: number) => {
    if (gameState !== "playing") return;
    const newClicked = new Set(clickedFactors);
    if (newClicked.has(opt)) {
      newClicked.delete(opt);
    } else {
      newClicked.add(opt);
    }
    setClickedFactors(newClicked);
  }, [gameState, clickedFactors]);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing") return;

    const allCorrect = factors.every(f => clickedFactors.has(f)) &&
      [...clickedFactors].every(f => factors.includes(f));

    if (allCorrect) {
      setFeedback("correct");
      const pts = factors.length * 50 + level * 100;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 1000);
    }
  }, [gameState, factors, clickedFactors, level, score, startRound]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cols = 4;
    const btnW = 80;
    const btnH = 55;
    const gap = 12;
    const totalW = cols * (btnW + gap) - gap;
    const startX = canvas.width / 2 - totalW / 2;

    for (let i = 0; i < options.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = 150 + row * (btnH + gap);
      if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) {
        handleOptionClick(options[i]);
        return;
      }
    }

    if (clickX >= canvas.width / 2 - 60 && clickX <= canvas.width / 2 + 60 &&
      clickY >= canvas.height - 35 && clickY <= canvas.height) {
      handleSubmit();
    }
  }, [gameState, options, handleOptionClick, handleSubmit]);

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
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) handleOptionClick(options[num - 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, options, startGame, handleOptionClick, handleSubmit]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Factor Battle</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={400}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Find all factors of the number, then submit!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Answer!</p>
              <p className="text-gray-300">Factors: <span className="text-white">{factors.join(", ")}</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">All factors found!</p>
      )}
    </div>
  );
}
