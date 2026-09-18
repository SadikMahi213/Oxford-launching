"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const CANVAS_W = 480;
const CANVAS_H = 400;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 55;
const BRICK_H = 20;
const BRICK_PAD = 4;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = (CANVAS_W - BRICK_COLS * (BRICK_W + BRICK_PAD) + BRICK_PAD) / 2;

const BRICK_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6"];

interface Brick {
  x: number;
  y: number;
  color: string;
  hits: number;
  alive: boolean;
}

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const paddleXRef = useRef(CANVAS_W / 2 - PADDLE_W / 2);
  const ballRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H - 30, dx: 3, dy: -3 });
  const bricksRef = useRef<Brick[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const initBricks = useCallback((lvl: number) => {
    const bricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + c * (BRICK_W + BRICK_PAD),
          y: BRICK_OFFSET_TOP + r * (BRICK_H + BRICK_PAD),
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          hits: lvl > 2 ? (r < 2 ? 2 : 1) : 1,
          alive: true,
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    bricksRef.current.forEach((brick) => {
      if (!brick.alive) return;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, BRICK_W, BRICK_H);
      if (brick.hits > 1) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(brick.x + 2, brick.y + 2, BRICK_W - 4, BRICK_H - 4);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(brick.x, brick.y, BRICK_W, BRICK_H);
    });

    ctx.fillStyle = "#60A5FA";
    ctx.fillRect(paddleXRef.current, CANVAS_H - 20, PADDLE_W, PADDLE_H);
    ctx.fillStyle = "#93C5FD";
    ctx.fillRect(paddleXRef.current + 4, CANVAS_H - 18, PADDLE_W - 8, 4);

    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#D1D5DB";
    ctx.stroke();

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
    ctx.fillText(`Lives: ${livesRef.current}`, 120, 20);
    ctx.textAlign = "right";
    ctx.fillText(`Level: ${level}`, CANVAS_W - 10, 20);
  }, [level]);

  const resetBall = useCallback(() => {
    paddleXRef.current = CANVAS_W / 2 - PADDLE_W / 2;
    ballRef.current = {
      x: CANVAS_W / 2,
      y: CANVAS_H - 30,
      dx: (Math.random() > 0.5 ? 1 : -1) * 3,
      dy: -3,
    };
  }, []);

  const gameLoop = useCallback(() => {
    const ball = ballRef.current;
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - BALL_R <= 0 || ball.x + BALL_R >= CANVAS_W) {
      ball.dx = -ball.dx;
    }
    if (ball.y - BALL_R <= 0) {
      ball.dy = -ball.dy;
    }

    if (ball.y + BALL_R >= CANVAS_H) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        setGameState("gameover");
        if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        return;
      }
      resetBall();
      return;
    }

    if (
      ball.y + BALL_R >= CANVAS_H - 20 &&
      ball.y + BALL_R <= CANVAS_H - 8 &&
      ball.x >= paddleXRef.current &&
      ball.x <= paddleXRef.current + PADDLE_W
    ) {
      const hitPos = (ball.x - paddleXRef.current) / PADDLE_W;
      const angle = (hitPos - 0.5) * Math.PI * 0.7;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      ball.dx = speed * Math.sin(angle);
      ball.dy = -Math.abs(speed * Math.cos(angle));
    }

    let allDestroyed = true;
    bricksRef.current.forEach((brick) => {
      if (!brick.alive) return;
      allDestroyed = false;
      if (
        ball.x + BALL_R > brick.x &&
        ball.x - BALL_R < brick.x + BRICK_W &&
        ball.y + BALL_R > brick.y &&
        ball.y - BALL_R < brick.y + BRICK_H
      ) {
        brick.hits--;
        if (brick.hits <= 0) {
          brick.alive = false;
          scoreRef.current += 10;
        } else {
          scoreRef.current += 5;
        }
        setScore(scoreRef.current);

        const overlapX = Math.min(ball.x + BALL_R - brick.x, brick.x + BRICK_W - (ball.x - BALL_R));
        const overlapY = Math.min(ball.y + BALL_R - brick.y, brick.y + BRICK_H - (ball.y - BALL_R));
        if (overlapX < overlapY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
      }
    });

    if (allDestroyed) {
      const newLevel = level + 1;
      setLevel(newLevel);
      initBricks(newLevel);
      resetBall();
    }

    draw();
  }, [draw, highScore, level, initBricks, resetBall]);

  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = setInterval(gameLoop, 16);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setLevel(1);
    initBricks(1);
    resetBall();
    setGameState("playing");
  }, [initBricks, resetBall]);

  useEffect(() => {
    draw();
  }, [gameState, draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    paddleXRef.current = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (CANVAS_W / rect.width);
    paddleXRef.current = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const step = 20;
      if (e.key === "ArrowLeft" || e.key === "a") {
        paddleXRef.current = Math.max(0, paddleXRef.current - step);
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        paddleXRef.current = Math.min(CANVAS_W - PADDLE_W, paddleXRef.current + step);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Breakout</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Move the paddle to keep the ball in play! Break all bricks to advance.
            Arrow keys, mouse, or touch to control.
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="rounded-lg border border-gray-700 cursor-none"
          style={{ maxWidth: "100%" }}
        />
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
            <p className="text-gray-400">Level {level}</p>
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
