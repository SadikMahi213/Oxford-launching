"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "won" | "gameover";

const WORDS = [
  { word: "JAVASCRIPT", hint: "Popular programming language" },
  { word: "PYTHON", hint: "Snake-named language" },
  { word: "ALGORITHM", hint: "Step-by-step procedure" },
  { word: "DATABASE", hint: "Stores structured data" },
  { word: "COMPILER", hint: "Translates code to machine language" },
  { word: "FRAMEWORK", hint: "Software development skeleton" },
  { word: "INTERFACE", hint: "Point of interaction" },
  { word: "FUNCTION", hint: "Reusable code block" },
  { word: "VARIABLE", hint: "Named storage for data" },
  { word: "SYNTAX", hint: "Rules for writing code" },
  { word: "BOOLEAN", hint: "True or false value" },
  { word: "GARBAGE", hint: "Automatic memory cleanup" },
  { word: "NETWORK", hint: "Connected computers" },
  { word: "BINARY", hint: "Base-2 number system" },
  { word: "DEBUGGER", hint: "Finds and fixes bugs" },
];

const MAX_WRONG = 7;

const drawHangman = (ctx: CanvasRenderingContext2D, wrong: number, canvas: HTMLCanvasElement) => {
  const cx = canvas.width / 2;
  const baseY = canvas.height - 20;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#6B7280";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(30, baseY);
  ctx.lineTo(180, baseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(60, baseY);
  ctx.lineTo(60, 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.lineTo(140, 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(140, 30);
  ctx.lineTo(140, 55);
  ctx.stroke();

  if (wrong >= 1) {
    ctx.beginPath();
    ctx.arc(140, 70, 15, 0, Math.PI * 2);
    ctx.strokeStyle = "#9CA3AF";
    ctx.stroke();
  }
  if (wrong >= 2) {
    ctx.beginPath();
    ctx.moveTo(140, 85);
    ctx.lineTo(140, 130);
    ctx.stroke();
  }
  if (wrong >= 3) {
    ctx.beginPath();
    ctx.moveTo(140, 95);
    ctx.lineTo(115, 115);
    ctx.stroke();
  }
  if (wrong >= 4) {
    ctx.beginPath();
    ctx.moveTo(140, 95);
    ctx.lineTo(165, 115);
    ctx.stroke();
  }
  if (wrong >= 5) {
    ctx.beginPath();
    ctx.moveTo(140, 130);
    ctx.lineTo(120, 160);
    ctx.stroke();
  }
  if (wrong >= 6) {
    ctx.beginPath();
    ctx.moveTo(140, 130);
    ctx.lineTo(160, 160);
    ctx.stroke();
  }
  if (wrong >= 7) {
    ctx.beginPath();
    ctx.arc(134, 65, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#EF4444";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(146, 65, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(140, 75, 4, 0, Math.PI);
    ctx.stroke();
  }
};

export default function Hangman() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawHangman(ctx, wrongGuesses, canvas);
  }, [wrongGuesses]);

  const startGame = useCallback(() => {
    const { word: w, hint: h } = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w);
    setHint(h);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setShowHint(false);
    setGameState("playing");
  }, []);

  const guessLetter = useCallback((letter: string) => {
    if (gameState !== "playing" || guessedLetters.has(letter)) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (!word.includes(letter)) {
      setWrongGuesses((w) => w + 1);
    }

    const wordLetters = new Set(word.split(""));
    const allGuessed = [...wordLetters].every((l) => newGuessed.has(l));

    if (allGuessed) {
      const pts = Math.max(50, 200 - wrongGuesses * 20 + (showHint ? 0 : 50));
      setScore((s) => s + pts);
      setStreak((s) => s + 1);
      setGameState("won");
    }
  }, [gameState, guessedLetters, word, showHint]);

  useEffect(() => {
    if (wrongGuesses >= MAX_WRONG && gameState === "playing") {
      setStreak(0);
      setGameState("gameover");
    }
  }, [wrongGuesses, gameState]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "playing" && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        guessLetter(e.key.toUpperCase());
      }
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "won" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
      if (e.key === "h" || e.key === "H") setShowHint(true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, guessLetter, startGame]);

  const displayWord = word.split("").map((ch) => (guessedLetters.has(ch) ? ch : "_"));

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Hangman</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Streak: {streak}</span>
        <span className="text-red-400">Wrong: {wrongGuesses}/{MAX_WRONG}</span>
      </div>
      <canvas ref={canvasRef} width={300} height={200} className="rounded-lg" />

      {(gameState === "playing" || gameState === "won" || gameState === "gameover") && (
        <>
          <div className="flex gap-2 text-3xl font-mono tracking-widest">
            {displayWord.map((ch, i) => (
              <span key={i} className={`w-10 text-center ${ch === "_" ? "border-b-2 border-white" : "text-green-400"}`}>
                {ch === "_" ? "" : ch}
              </span>
            ))}
          </div>

          {showHint && <p className="text-blue-300 text-sm italic">Hint: {hint}</p>}

          {gameState === "playing" && (
            <>
              <div className="flex flex-wrap gap-1 justify-center max-w-[350px]">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
                  <button
                    key={l}
                    onClick={() => guessLetter(l)}
                    disabled={guessedLetters.has(l)}
                    className={`w-9 h-9 rounded text-xs font-bold ${
                      guessedLetters.has(l)
                        ? word.includes(l) ? "bg-green-700" : "bg-red-700"
                        : "bg-gray-600 hover:bg-gray-500"
                    } text-white`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {!showHint && (
                <button onClick={() => setShowHint(true)} className="text-blue-400 text-sm hover:underline">Show Hint (H)</button>
              )}
            </>
          )}
        </>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Correct! 🎉</p>
          <p className="text-gray-400 text-sm">Streak: {streak}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Next Word</button>
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
        <div className="text-center">
          <p className="text-gray-300 mb-3">Guess the word one letter at a time before the hangman is drawn!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}
    </div>
  );
}
