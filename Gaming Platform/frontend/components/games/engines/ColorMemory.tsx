"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";

const COLORS = [
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Orange", hex: "#F97316" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Cyan", hex: "#06B6D4" },
];

export default function ColorMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
    ctx.fillText(`Level ${level} | Score: ${score}`, canvas.width / 2, 30);

    const cols = 4;
    const rows = 2;
    const padding = 40;
    const gap = 12;
    const cellW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const cellH = (canvas.height - padding * 2 - gap * (rows - 1) - 60) / rows;

    COLORS.forEach((color, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cellW + gap);
      const y = 50 + padding + row * (cellH + gap);

      const isActive = activeIndex === i;
      const isInput = gameState === "input" && playerInput.includes(i);

      ctx.fillStyle = isActive ? color.hex : isInput ? color.hex + "80" : color.hex + "40";
      ctx.beginPath();
      ctx.roundRect(x, y, cellW, cellH, 12);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (isInput) {
        ctx.strokeStyle = color.hex;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = isActive ? "#FFFFFF" : "#E2E8F0";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(color.name, x + cellW / 2, y + cellH / 2);
    });

    if (gameState === "showing") {
      ctx.fillStyle = "#EAB308";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Watch the colors!", canvas.width / 2, canvas.height - 15);
    } else if (gameState === "input") {
      ctx.fillStyle = "#22C55E";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Your turn! (${playerInput.length}/${sequence.length})`, canvas.width / 2, canvas.height - 15);
    }
  }, [gameState, score, level, activeIndex, playerInput, sequence]);

  useEffect(() => {
    draw();
  }, [draw]);

  const playSequence = useCallback((seq: number[]) => {
    clearTimeouts();
    setGameState("showing");
    setActiveIndex(null);

    seq.forEach((colorIdx, i) => {
      const onTimeout = setTimeout(() => {
        setActiveIndex(colorIdx);
      }, i * 600 + 200);
      const offTimeout = setTimeout(() => {
        setActiveIndex(null);
      }, i * 600 + 600);
      timeoutsRef.current.push(onTimeout, offTimeout);
    });

    const doneTimeout = setTimeout(() => {
      setGameState("input");
      setPlayerInput([]);
    }, seq.length * 600 + 500);
    timeoutsRef.current.push(doneTimeout);
  }, [clearTimeouts]);

  const startGame = useCallback(() => {
    clearTimeouts();
    const firstColor = Math.floor(Math.random() * 8);
    const newSeq = [firstColor];
    setSequence(newSeq);
    setScore(0);
    setLevel(1);
    setGameState("playing");
    setTimeout(() => playSequence(newSeq), 500);
  }, [clearTimeouts, playSequence]);

  const handleColorClick = useCallback((index: number) => {
    if (gameState !== "input") return;

    setActiveIndex(index);
    setTimeout(() => setActiveIndex(null), 200);

    const newInput = [...playerInput, index];
    setPlayerInput(newInput);

    if (newInput[newInput.length - 1] !== sequence[newInput.length - 1]) {
      if (score > highScore) setHighScore(score);
      setTimeout(() => setGameState("gameover"), 500);
      return;
    }

    if (newInput.length === sequence.length) {
      const newScore = score + level * 150;
      setScore(newScore);
      const newColor = Math.floor(Math.random() * 8);
      const newSeq = [...sequence, newColor];
      setSequence(newSeq);
      setLevel(l => l + 1);
      setTimeout(() => playSequence(newSeq), 800);
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

      const keyMap: Record<string, number> = {
        "1": 0, "2": 1, "3": 2, "4": 3,
        "5": 4, "6": 5, "7": 6, "8": 7,
        "q": 0, "w": 1, "e": 2, "r": 3,
        "a": 4, "s": 5, "d": 6, "f": 7,
      };
      if (keyMap[e.key] !== undefined) {
        handleColorClick(keyMap[e.key]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleColorClick, startGame]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "input") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cols = 4;
    const padding = 40;
    const gap = 12;
    const cellW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const cellH = (canvas.height - padding * 2 - gap - 60) / 2;

    for (let i = 0; i < 8; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cellW + gap);
      const y = 50 + padding + row * (cellH + gap);
      if (clickX >= x && clickX <= x + cellW && clickY >= y && clickY <= y + cellH) {
        handleColorClick(i);
        break;
      }
    }
  }, [gameState, handleColorClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Color Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={320}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Watch the color sequence, then repeat it!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Color!</p>
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
