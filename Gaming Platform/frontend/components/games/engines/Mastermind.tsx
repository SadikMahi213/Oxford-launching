"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "won" | "gameover";

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 10;
const COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#EAB308", "#8B5CF6", "#F97316"];
const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"];

const generateCode = (): number[] =>
  Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * COLORS.length));

const getFeedback = (guess: number[], code: number[]): { black: number; white: number } => {
  let black = 0;
  const codeCopy = [...code];
  const guessCopy = [...guess];

  for (let i = CODE_LENGTH - 1; i >= 0; i--) {
    if (guessCopy[i] === codeCopy[i]) {
      black++;
      codeCopy.splice(i, 1);
      guessCopy.splice(i, 1);
    }
  }

  let white = 0;
  for (const g of guessCopy) {
    const idx = codeCopy.indexOf(g);
    if (idx !== -1) {
      white++;
      codeCopy.splice(idx, 1);
    }
  }

  return { black, white };
};

export default function Mastermind() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [code, setCode] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<{ guess: number[]; feedback: { black: number; white: number } }[]>([]);
  const [currentGuess, setCurrentGuess] = useState<number[]>(Array(CODE_LENGTH).fill(0));
  const [selectedPos, setSelectedPos] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const CELL = 40;
  const MARGIN_TOP = 30;
  const MARGIN_LEFT = 60;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#374151";
    ctx.fillRect(10, 10, canvas.width - 20, MARGIN_TOP + MAX_ATTEMPTS * (CELL + 8) + 20);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const y = MARGIN_TOP + i * (CELL + 8);

      ctx.fillStyle = "#4B5563";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${MAX_ATTEMPTS - i}`, MARGIN_LEFT - 10, y + CELL / 2 + 4);

      if (i < guesses.length) {
        const { guess, feedback } = guesses[i];
        guess.forEach((c, j) => {
          ctx.fillStyle = COLORS[c];
          ctx.beginPath();
          ctx.arc(MARGIN_LEFT + j * (CELL + 8) + CELL / 2, y + CELL / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1F2937";
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        for (let f = 0; f < feedback.black; f++) {
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(MARGIN_LEFT + CODE_LENGTH * (CELL + 8) + 15 + f * 14, y + 10, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let f = 0; f < feedback.white; f++) {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(MARGIN_LEFT + CODE_LENGTH * (CELL + 8) + 15 + (feedback.black + f) * 14, y + 10, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (i === guesses.length && gameState === "playing") {
        currentGuess.forEach((c, j) => {
          const isSelected = j === selectedPos;
          ctx.fillStyle = isSelected ? "#3B82F6" : COLORS[c];
          ctx.beginPath();
          ctx.arc(MARGIN_LEFT + j * (CELL + 8) + CELL / 2, y + CELL / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          if (isSelected) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      }
    }

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Black = right color + position | White = right color, wrong position", canvas.width / 2, canvas.height - 10);
  }, [guesses, currentGuess, selectedPos, gameState]);

  const startGame = useCallback(() => {
    setCode(generateCode());
    setGuesses([]);
    setCurrentGuess(Array(CODE_LENGTH).fill(0));
    setSelectedPos(0);
    setAttempts(0);
    setScore(0);
    setGameState("playing");
  }, []);

  const submitGuess = useCallback(() => {
    if (gameState !== "playing") return;
    const feedback = getFeedback(currentGuess, code);
    const newGuesses = [...guesses, { guess: [...currentGuess], feedback }];
    setGuesses(newGuesses);
    setAttempts((a) => a + 1);

    if (feedback.black === CODE_LENGTH) {
      const pts = Math.max(100, 1000 - attempts * 80);
      setScore(pts);
      setGameState("won");
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState("gameover");
    } else {
      setCurrentGuess(Array(CODE_LENGTH).fill(0));
      setSelectedPos(0);
    }
  }, [gameState, currentGuess, code, guesses, attempts]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "won" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
      if (gameState === "playing") {
        if (e.key >= "1" && e.key <= "6") {
          const colorIdx = parseInt(e.key) - 1;
          setCurrentGuess((prev) => {
            const newGuess = [...prev];
            newGuess[selectedPos] = colorIdx;
            return newGuess;
          });
          setSelectedPos((p) => (p + 1) % CODE_LENGTH);
        }
        if (e.key === "ArrowLeft") setSelectedPos((p) => (p - 1 + CODE_LENGTH) % CODE_LENGTH);
        if (e.key === "ArrowRight") setSelectedPos((p) => (p + 1) % CODE_LENGTH);
        if (e.key === "Enter") submitGuess();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, selectedPos, submitGuess]);

  const codeWidth = CODE_LENGTH * (CELL + 8) + 120;

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Mastermind</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Attempts: {attempts}/{MAX_ATTEMPTS}</span>
      </div>
      <canvas ref={canvasRef} width={Math.max(codeWidth, 350)} height={MARGIN_TOP + MAX_ATTEMPTS * (CELL + 8) + 30} className="rounded-lg" />

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {COLORS.map((c, i) => (
              <button key={i} onClick={() => {
                setCurrentGuess((prev) => { const n = [...prev]; n[selectedPos] = i; return n; });
                setSelectedPos((p) => (p + 1) % CODE_LENGTH);
              }} className="w-10 h-10 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={submitGuess} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold">Submit Guess (Enter)</button>
          <p className="text-gray-400 text-xs">Keys 1-6 to select color, Arrows to move position</p>
        </div>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Crack the secret code! Black pegs = correct color & position. White pegs = correct color, wrong position.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Code Cracked! 🎉</p>
          <p className="text-white">Score: {score} | Attempts: {attempts}</p>
          <p className="text-gray-400 text-sm">Code: {code.map((c) => COLOR_NAMES[c]).join(", ")}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-red-400 text-lg font-bold">Out of Attempts!</p>
          <p className="text-gray-400">Code was: {code.map((c) => COLOR_NAMES[c]).join(", ")}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
