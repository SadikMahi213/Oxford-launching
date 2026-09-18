"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Food = Point & { type: "normal" | "bonus" };

const GRID_SIZE = 20;
const CELL_SIZE = 20;

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(150);

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Direction>("RIGHT");
  const nextDirRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<Food>({ x: 15, y: 10, type: "normal" });
  const scoreRef = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dirLockRef = useRef(false);

  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));

    const isBonus = Math.random() < 0.15;
    foodRef.current = { ...pos, type: isBonus ? "bonus" : "normal" };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#1F2937";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    const food = foodRef.current;
    ctx.fillStyle = food.type === "bonus" ? "#F59E0B" : "#EF4444";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      food.type === "bonus" ? CELL_SIZE / 2 - 1 : CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (food.type === "bonus") {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
    }

    snakeRef.current.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? "#22C55E" : i % 2 === 0 ? "#16A34A" : "#15803D";
      ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      if (isHead) {
        ctx.fillStyle = "#FFFFFF";
        const eyeSize = 3;
        const eyeOffset = 5;
        if (dirRef.current === "RIGHT" || dirRef.current === "LEFT") {
          ctx.fillRect(seg.x * CELL_SIZE + CELL_SIZE / 2 + (dirRef.current === "RIGHT" ? 3 : -6), seg.y * CELL_SIZE + 4, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL_SIZE + CELL_SIZE / 2 + (dirRef.current === "RIGHT" ? 3 : -6), seg.y * CELL_SIZE + 13, eyeSize, eyeSize);
        } else {
          ctx.fillRect(seg.x * CELL_SIZE + 4, seg.y * CELL_SIZE + CELL_SIZE / 2 + (dirRef.current === "DOWN" ? 3 : -6), eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL_SIZE + 13, seg.y * CELL_SIZE + CELL_SIZE / 2 + (dirRef.current === "DOWN" ? 3 : -6), eyeSize, eyeSize);
        }
      }
    });

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, GRID_SIZE * CELL_SIZE - 30, GRID_SIZE * CELL_SIZE, 30);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Score: ${scoreRef.current}  |  Length: ${snakeRef.current.length}`,
      (GRID_SIZE * CELL_SIZE) / 2,
      GRID_SIZE * CELL_SIZE - 12
    );
  }, []);

  const gameLoop = useCallback(() => {
    const snake = [...snakeRef.current];
    dirRef.current = nextDirRef.current;
    dirLockRef.current = false;

    const head = { ...snake[0] };
    switch (dirRef.current) {
      case "UP": head.y--; break;
      case "DOWN": head.y++; break;
      case "LEFT": head.x--; break;
      case "RIGHT": head.x++; break;
    }

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState("gameover");
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      return;
    }

    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      setGameState("gameover");
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      return;
    }

    snake.unshift(head);

    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      const points = food.type === "bonus" ? 5 : 1;
      scoreRef.current += points;
      setScore(scoreRef.current);
      spawnFood();
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw, highScore, spawnFood]);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    scoreRef.current = 0;
    dirLockRef.current = false;
    setScore(0);
    spawnFood();
    setGameState("playing");

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(gameLoop, speed);
  }, [gameLoop, speed, spawnFood]);

  useEffect(() => {
    if (gameState === "playing") {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else if (gameState === "gameover" || gameState === "paused") {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, gameLoop, speed]);

  useEffect(() => {
    draw();
  }, [gameState, draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.key === "p" || e.key === "P") {
        setGameState((s) => (s === "playing" ? "paused" : s === "paused" ? "playing" : s));
        return;
      }

      if (dirLockRef.current) return;
      const dir = dirRef.current;

      switch (e.key) {
        case "ArrowUp": case "w": case "W":
          if (dir !== "DOWN") { nextDirRef.current = "UP"; dirLockRef.current = true; }
          break;
        case "ArrowDown": case "s": case "S":
          if (dir !== "UP") { nextDirRef.current = "DOWN"; dirLockRef.current = true; }
          break;
        case "ArrowLeft": case "a": case "A":
          if (dir !== "RIGHT") { nextDirRef.current = "LEFT"; dirLockRef.current = true; }
          break;
        case "ArrowRight": case "d": case "D":
          if (dir !== "LEFT") { nextDirRef.current = "RIGHT"; dirLockRef.current = true; }
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  const handleDirection = (dir: Direction) => {
    if (dirLockRef.current) return;
    const current = dirRef.current;
    if (dir === "UP" && current !== "DOWN") { nextDirRef.current = dir; dirLockRef.current = true; }
    if (dir === "DOWN" && current !== "UP") { nextDirRef.current = dir; dirLockRef.current = true; }
    if (dir === "LEFT" && current !== "RIGHT") { nextDirRef.current = dir; dirLockRef.current = true; }
    if (dir === "RIGHT" && current !== "LEFT") { nextDirRef.current = dir; dirLockRef.current = true; }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Snake</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move, P to pause</p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        className="rounded-lg border border-gray-700"
      />

      {gameState === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-3xl font-bold text-white">PAUSED</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 md:hidden">
        <div />
        <button onClick={() => handleDirection("UP")} className="w-14 h-14 bg-gray-700 rounded-lg text-2xl flex items-center justify-center">↑</button>
        <div />
        <button onClick={() => handleDirection("LEFT")} className="w-14 h-14 bg-gray-700 rounded-lg text-2xl flex items-center justify-center">←</button>
        <button onClick={() => handleDirection("DOWN")} className="w-14 h-14 bg-gray-700 rounded-lg text-2xl flex items-center justify-center">↓</button>
        <button onClick={() => handleDirection("RIGHT")} className="w-14 h-14 bg-gray-700 rounded-lg text-2xl flex items-center justify-center">→</button>
      </div>

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
