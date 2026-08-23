"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "spinning" | "guessing" | "gameover";

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F43F5E", "#6366F1", "#84CC16", "#F59E0B"];

export default function NumberWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(10);
  const [wheel1Angle, setWheel1Angle] = useState(0);
  const [wheel2Angle, setWheel2Angle] = useState(0);
  const [wheel1Result, setWheel1Result] = useState(0);
  const [wheel2Result, setWheel2Result] = useState(0);
  const [guess, setGuess] = useState<"higher" | "lower" | "same" | "">("");
  const [message, setMessage] = useState("");
  const [streak, setStreak] = useState(0);

  const angle1Ref = useRef(0);
  const angle2Ref = useRef(0);
  const speed1Ref = useRef(0);
  const speed2Ref = useRef(0);
  const animRef = useRef<number | null>(null);
  const spinningRef = useRef(false);

  const drawWheel = useCallback((cx: number, cy: number, r: number, angle: number, highlightIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * (Math.PI / 180));

    NUMBERS.forEach((num, i) => {
      const startA = (i / NUMBERS.length) * Math.PI * 2;
      const endA = ((i + 1) / NUMBERS.length) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = i === highlightIdx ? "#FBBF24" : COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate(startA + (endA - startA) / 2);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(num), r * 0.65, 5);
      ctx.restore();
    });
    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const halfW = canvas.width / 2;
    drawWheel(halfW - 80, 130, 90, angle1Ref.current, wheel1Result > 0 ? wheel1Result - 1 : -1);
    drawWheel(halfW + 80, 130, 90, angle2Ref.current, wheel2Result > 0 ? wheel2Result - 1 : -1);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Wheel 1", halfW - 80, 250);
    ctx.fillText("Wheel 2", halfW + 80, 250);

    if (wheel1Result > 0 && wheel2Result > 0) {
      ctx.font = "bold 20px Arial";
      ctx.fillText(`${wheel1Result}`, halfW - 80, 30);
      ctx.fillText("vs", halfW, 30);
      ctx.fillText(`${wheel2Result}`, halfW + 80, 30);
    }
  }, [drawWheel, wheel1Result, wheel2Result]);

  const spinWheels = useCallback(() => {
    if (spinningRef.current || spinsLeft <= 0) return;
    spinningRef.current = true;
    setGameState("spinning");
    setMessage("");
    setGuess("");

    speed1Ref.current = 14 + Math.random() * 10;
    speed2Ref.current = 14 + Math.random() * 10;
    let settled1 = false;
    let settled2 = false;
    let result1 = 0;
    let result2 = 0;

    const animate = () => {
      speed1Ref.current *= 0.985;
      speed2Ref.current *= 0.987;
      angle1Ref.current = (angle1Ref.current + speed1Ref.current) % 360;
      angle2Ref.current = (angle2Ref.current + speed2Ref.current) % 360;
      setWheel1Angle(angle1Ref.current);
      setWheel2Angle(angle2Ref.current);

      if (speed1Ref.current < 0.3 && !settled1) {
        const norm = (360 - (angle1Ref.current % 360)) % 360;
        result1 = (Math.floor((norm / 360) * 12) % 12) + 1;
        setWheel1Result(result1);
        settled1 = true;
      }
      if (speed2Ref.current < 0.3 && !settled2) {
        const norm = (360 - (angle2Ref.current % 360)) % 360;
        result2 = (Math.floor((norm / 360) * 12) % 12) + 1;
        setWheel2Result(result2);
        settled2 = true;
      }

      draw();

      if (settled1 && settled2) {
        spinningRef.current = false;
        setGameState("guessing");
        return;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [spinsLeft, draw]);

  const makeGuess = useCallback((g: "higher" | "lower" | "same") => {
    setGuess(g);
    const diff = wheel2Result - wheel1Result;
    let won = false;

    if (g === "higher" && diff > 0) won = true;
    if (g === "lower" && diff < 0) won = true;
    if (g === "same" && diff === 0) won = true;

    const points = won ? 100 + streak * 25 : 0;
    if (won) {
      setScore((s) => s + points);
      setStreak((s) => s + 1);
      setMessage(`Correct! +${points} points`);
    } else {
      setStreak(0);
      setMessage(`Wrong! ${wheel1Result} vs ${wheel2Result}`);
    }

    setSpinsLeft((s) => s - 1);

    setTimeout(() => {
      setWheel1Result(0);
      setWheel2Result(0);
      setGuess("");
      if (spinsLeft - 1 <= 0) {
        const finalScore = won ? score + points : score;
        if (finalScore > highScore) setHighScore(finalScore);
        setGameState("gameover");
      } else {
        setGameState("idle");
      }
    }, 1500);
  }, [wheel1Result, wheel2Result, streak, score, highScore, spinsLeft]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        spinWheels();
      }
      if (gameState === "guessing") {
        if (e.key === "1") makeGuess("higher");
        if (e.key === "2") makeGuess("lower");
        if (e.key === "3") makeGuess("same");
      }
      if (e.key === "r" || e.key === "R") {
        setScore(0);
        setSpinsLeft(10);
        setStreak(0);
        setMessage("");
        setGameState("idle");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, spinWheels, makeGuess]);

  useEffect(() => {
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Number Wheel</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">High: {highScore}</span>
        <span className="text-blue-400">Spins: {spinsLeft}</span>
        <span className="text-green-400">Streak: {streak}</span>
      </div>
      <canvas ref={canvasRef} width={340} height={260} className="rounded-lg" />

      {message && <div className={`text-lg font-bold ${message.includes("Correct") ? "text-green-400" : "text-red-400"}`}>{message}</div>}

      {gameState === "idle" && (
        <button onClick={spinWheels} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold text-lg">
          Spin Both Wheels (Space)
        </button>
      )}

      {gameState === "guessing" && (
        <div className="text-center">
          <p className="text-white mb-2">Will Wheel 2 be higher, lower, or the same as Wheel 1?</p>
          <div className="flex gap-2">
            <button onClick={() => makeGuess("higher")} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded">Higher (1)</button>
            <button onClick={() => makeGuess("same")} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded">Same (3)</button>
            <button onClick={() => makeGuess("lower")} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">Lower (2)</button>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-xl text-yellow-400 font-bold">Game Over!</p>
          <p className="text-white">Final Score: {score}</p>
          <button onClick={() => { setScore(0); setSpinsLeft(10); setStreak(0); setMessage(""); setGameState("idle"); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}

      {gameState === "spinning" && <p className="text-gray-400">Spinning...</p>}
    </div>
  );
}
