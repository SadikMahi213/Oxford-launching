"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const DIR_COLORS: Record<Direction, string> = {
  UP: "#EF4444",
  DOWN: "#3B82F6",
  LEFT: "#22C55E",
  RIGHT: "#F59E0B",
};

const DIR_SYMBOLS: Record<Direction, string> = {
  UP: "▲",
  DOWN: "▼",
  LEFT: "◄",
  RIGHT: "►",
};

export default function SequenceChallenge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<Direction[]>([]);
  const [playerInput, setPlayerInput] = useState<Direction[]>([]);
  const [currentShowIndex, setCurrentShowIndex] = useState(-1);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
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
    ctx.fillText(`Level ${level} | Score: ${score} | Length: ${sequence.length}`, canvas.width / 2, 25);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    const dirs: Direction[] = ["UP", "RIGHT", "DOWN", "LEFT"];
    dirs.forEach((dir, i) => {
      const angle = (i * Math.PI) / 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const isHighlighted = gameState === "showing" && currentShowIndex >= 0 && sequence[currentShowIndex] === dir;
      const isPlayerChoice = gameState === "input" && playerInput.length > 0 && playerInput[playerInput.length - 1] === dir;

      ctx.fillStyle = isHighlighted || isPlayerChoice ? DIR_COLORS[dir] : "#334155";
      ctx.beginPath();
      ctx.roundRect(x - 35, y - 35, 70, 70, 12);
      ctx.fill();

      if (isHighlighted || isPlayerChoice) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(DIR_SYMBOLS[dir], x, y);
    });

    ctx.fillStyle = "#94A3B8";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Arrow keys to input", centerX, canvas.height - 15);

    if (gameState === "showing") {
      ctx.fillStyle = "#EAB308";
      ctx.font = "16px sans-serif";
      ctx.fillText("Watch the sequence!", centerX, 50);
    } else if (gameState === "input") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Your turn! (${playerInput.length}/${sequence.length})`, centerX, 50);
    }
  }, [gameState, score, level, sequence, playerInput, currentShowIndex]);

  useEffect(() => {
    draw();
  }, [draw]);

  const playSequence = useCallback((seq: Direction[]) => {
    clearTimeouts();
    setGameState("showing");
    setCurrentShowIndex(-1);

    seq.forEach((_, i) => {
      const t = setTimeout(() => setCurrentShowIndex(i), i * 700 + 300);
      timeoutsRef.current.push(t);
    });

    const doneTimeout = setTimeout(() => {
      setCurrentShowIndex(-1);
      setGameState("input");
      setPlayerInput([]);
    }, seq.length * 700 + 500);
    timeoutsRef.current.push(doneTimeout);
  }, [clearTimeouts]);

  const startGame = useCallback(() => {
    clearTimeouts();
    const dirs: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    const firstDir = dirs[Math.floor(Math.random() * 4)];
    const newSeq = [firstDir];
    setSequence(newSeq);
    setScore(0);
    setLevel(1);
    setGameState("playing");
    setTimeout(() => playSequence(newSeq), 500);
  }, [clearTimeouts, playSequence]);

  const handleDirection = useCallback((dir: Direction) => {
    if (gameState !== "input") return;

    const newInput = [...playerInput, dir];
    setPlayerInput(newInput);

    if (newInput[newInput.length - 1] !== sequence[newInput.length - 1]) {
      setFeedback("wrong");
      if (score > highScore) setHighScore(score);
      setTimeout(() => setGameState("gameover"), 800);
      return;
    }

    if (newInput.length === sequence.length) {
      setFeedback("correct");
      const pts = sequence.length * 100;
      setScore(s => s + pts);
      const newLevel = level + 1;
      setLevel(newLevel);
      const dirs: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
      const newSeq = [...sequence, dirs[Math.floor(Math.random() * 4)]];
      setSequence(newSeq);
      setTimeout(() => {
        setFeedback(null);
        playSequence(newSeq);
      }, 1000);
    }
  }, [gameState, playerInput, sequence, score, level, highScore, playSequence]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "input") return;

      switch (e.key) {
        case "ArrowUp": case "w": handleDirection("UP"); break;
        case "ArrowDown": case "s": handleDirection("DOWN"); break;
        case "ArrowLeft": case "a": handleDirection("LEFT"); break;
        case "ArrowRight": case "d": handleDirection("RIGHT"); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleDirection, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Sequence Challenge</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Watch the arrow sequence, then repeat it!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Sequence!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct! +{sequence.length * 100} pts</p>
      )}
    </div>
  );
}
