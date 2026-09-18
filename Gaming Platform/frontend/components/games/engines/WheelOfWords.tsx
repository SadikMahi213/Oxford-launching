"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "spinning" | "guessing" | "won" | "gameover";

const WORDS = [
  "JAVASCRIPT", "PYTHON", "CANVAS", "REACT", "FUNCTION",
  "VARIABLE", "COMPILER", "DATABASE", "NETWORK", "BINARY",
  "ALGORITHM", "BOOLEAN", "CLASSES", "DEBUGGER", "ELEMENTS",
  "FRAMEWORK", "GARbage", "HASHMAP", "INTERFACE", "KERNEL",
  "LIBRARY", "MODULE", "OBJECT", "PACKAGES", "QUEUE",
];

const SEGMENTS = [
  { label: "100", value: 100, color: "#EF4444" },
  { label: "200", value: 200, color: "#F97316" },
  { label: "300", value: 300, color: "#EAB308" },
  { label: "500", value: 500, color: "#22C55E" },
  { label: "BANKRUPT", value: 0, color: "#1F2937" },
  { label: "50", value: 50, color: "#3B82F6" },
  { label: "400", value: 400, color: "#8B5CF6" },
  { label: "750", value: 750, color: "#EC4899" },
];

export default function WheelOfWords() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [word, setWord] = useState("");
  const [revealed, setRevealed] = useState<string[]>([]);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastSpinValue, setLastSpinValue] = useState(0);
  const [currentLetter, setCurrentLetter] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState(0);

  const wheelAngleRef = useRef(0);
  const spinAnimRef = useRef<number | null>(null);
  const spinSpeedRef = useRef(0);

  const startGame = useCallback(() => {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w);
    setRevealed(Array(w.length).fill("_"));
    setGuessedLetters([]);
    setScore(0);
    setWrongGuesses(0);
    setLastSpinValue(0);
    setCurrentLetter("");
    setSpinning(false);
    setGameState("guessing");
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = 160;
    const r = 120;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wheelAngleRef.current * (Math.PI / 180));

    SEGMENTS.forEach((seg, i) => {
      const startA = (i / SEGMENTS.length) * Math.PI * 2;
      const endA = ((i + 1) / SEGMENTS.length) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate(startA + (endA - startA) / 2);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(seg.label, r * 0.6, 4);
      ctx.restore();
    });
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 10);
    ctx.lineTo(cx - 10, cy - r - 25);
    ctx.lineTo(cx + 10, cy - r - 25);
    ctx.closePath();
    ctx.fill();
  }, []);

  const spinWheel = useCallback(() => {
    if (spinning || gameState !== "guessing") return;
    setSpinning(true);
    spinSpeedRef.current = 15 + Math.random() * 20;

    const animate = () => {
      spinSpeedRef.current *= 0.985;
      wheelAngleRef.current = (wheelAngleRef.current + spinSpeedRef.current) % 360;
      setWheelAngle(wheelAngleRef.current);
      drawWheel();

      if (spinSpeedRef.current > 0.3) {
        spinAnimRef.current = requestAnimationFrame(animate);
      } else {
        const normalized = ((360 - (wheelAngleRef.current % 360)) % 360);
        const segIndex = Math.floor((normalized / 360) * SEGMENTS.length) % SEGMENTS.length;
        const seg = SEGMENTS[segIndex];
        setLastSpinValue(seg.value);
        setSpinning(false);
        if (seg.value === 0) {
          setScore(0);
          setWrongGuesses((p) => p + 1);
        }
        drawWheel();
      }
    };
    spinAnimRef.current = requestAnimationFrame(animate);
  }, [spinning, gameState, drawWheel]);

  const guessLetter = useCallback((letter: string) => {
    if (gameState !== "guessing" || spinning || guessedLetters.includes(letter)) return;
    setGuessedLetters((p) => [...p, letter]);
    setCurrentLetter(letter);

    if (word.includes(letter)) {
      const newRevealed = revealed.map((ch, i) =>
        word[i] === letter ? letter : ch
      );
      setRevealed(newRevealed);
      const points = lastSpinValue * (letter === "Q" || letter === "X" ? 2 : 1);
      setScore((s) => s + points);

      if (newRevealed.every((ch) => ch !== "_")) {
        const finalScore = score + points;
        setScore(finalScore);
        if (finalScore > highScore) setHighScore(finalScore);
        setGameState("won");
      }
    } else {
      setWrongGuesses((p) => p + 1);
      if (wrongGuesses + 1 >= 6) {
        setGameState("gameover");
      }
    }
  }, [gameState, spinning, guessedLetters, word, revealed, lastSpinValue, score, highScore, wrongGuesses]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "guessing" && !spinning && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        guessLetter(e.key.toUpperCase());
      }
      if (gameState === "idle" || gameState === "won" || gameState === "gameover") {
        if (e.key === " " || e.key === "Enter") startGame();
      }
      if (e.key === " " && gameState === "guessing" && !spinning) {
        e.preventDefault();
        spinWheel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, spinning, guessLetter, startGame, spinWheel]);

  useEffect(() => {
    drawWheel();
    return () => { if (spinAnimRef.current) cancelAnimationFrame(spinAnimRef.current); };
  }, [drawWheel]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Wheel of Words</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">High: {highScore}</span>
        <span className="text-red-400">Wrong: {wrongGuesses}/6</span>
      </div>
      <canvas ref={canvasRef} width={300} height={320} className="rounded-lg" />

      {gameState === "guessing" && (
        <>
          <div className="flex gap-1 text-2xl font-mono">
            {revealed.map((ch, i) => (
              <span key={i} className={ch === "_" ? "border-b-2 border-white w-8 text-center" : "w-8 text-center text-white"}>
                {ch === "_" ? "" : ch}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-300">
            Last spin: <span className="text-yellow-300 font-bold">{lastSpinValue}</span> pts
          </div>
          <button
            onClick={spinWheel}
            disabled={spinning}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
          >
            {spinning ? "Spinning..." : "Spin Wheel (Space)"}
          </button>
          <div className="flex flex-wrap gap-1 justify-center max-w-[320px]">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
              <button
                key={l}
                onClick={() => guessLetter(l)}
                disabled={guessedLetters.includes(l)}
                className={`w-8 h-8 rounded text-xs font-bold ${
                  guessedLetters.includes(l)
                    ? word.includes(l) ? "bg-green-700" : "bg-red-700"
                    : "bg-gray-600 hover:bg-gray-500"
                } text-white`}
              >
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">You solved it! 🎉</p>
          <p className="text-white">Word: {word}</p>
          <p className="text-yellow-400">Score: {score}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-red-400 text-lg font-bold">Game Over!</p>
          <p className="text-white">Word was: {word}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}

      {gameState === "idle" && (
        <div className="text-center text-gray-300">
          <p className="mb-2">Spin the wheel, guess letters to solve the word!</p>
          <p className="text-sm mb-3">Bankrupt resets your score for this round.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}
    </div>
  );
}
