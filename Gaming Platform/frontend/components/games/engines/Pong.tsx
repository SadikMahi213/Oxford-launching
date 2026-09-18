"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 600;
const H = 400;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_R = 6;
const AI_SPEED = 3.5;

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [highScore, setHighScore] = useState(0);

  const playerYRef = useRef(H / 2 - PADDLE_H / 2);
  const computerYRef = useRef(H / 2 - PADDLE_H / 2);
  const ballRef = useRef({ x: W / 2, y: H / 2, dx: 4, dy: 3 });
  const scoreRef = useRef({ player: 0, computer: 0 });
  const animRef = useRef<number>(0);
  const mouseYRef = useRef(H / 2);

  const resetBall = useCallback((dir: 1 | -1) => {
    ballRef.current = {
      x: W / 2,
      y: H / 2,
      dx: dir * (3 + Math.random() * 2),
      dy: (Math.random() - 0.5) * 6,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#4B5563";
    ctx.fillRect(8, playerYRef.current, PADDLE_W, PADDLE_H);
    ctx.fillRect(W - 18, computerYRef.current, PADDLE_W, PADDLE_H);

    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${scoreRef.current.player}`, W / 4, 40);
    ctx.fillText(`${scoreRef.current.computer}`, (W * 3) / 4, 40);
  }, []);

  const gameLoop = useCallback(() => {
    const ball = ballRef.current;

    const targetY = mouseYRef.current - PADDLE_H / 2;
    const diff = targetY - playerYRef.current;
    playerYRef.current += diff * 0.15;
    playerYRef.current = Math.max(0, Math.min(H - PADDLE_H, playerYRef.current));

    const aiTarget = ball.y - PADDLE_H / 2;
    const aiDiff = aiTarget - computerYRef.current;
    if (Math.abs(aiDiff) > AI_SPEED) {
      computerYRef.current += Math.sign(aiDiff) * AI_SPEED;
    }
    computerYRef.current = Math.max(0, Math.min(H - PADDLE_H, computerYRef.current));

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y - BALL_R <= 0 || ball.y + BALL_R >= H) {
      ball.dy = -ball.dy;
      ball.y = ball.y - BALL_R <= 0 ? BALL_R : H - BALL_R;
    }

    const py = playerYRef.current;
    if (
      ball.dx < 0 &&
      ball.x - BALL_R <= 18 &&
      ball.y >= py &&
      ball.y <= py + PADDLE_H
    ) {
      const hitPos = (ball.y - py) / PADDLE_H;
      const angle = (hitPos - 0.5) * Math.PI * 0.6;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.05;
      ball.dx = Math.abs(speed * Math.cos(angle));
      ball.dy = speed * Math.sin(angle);
    }

    const cy = computerYRef.current;
    if (
      ball.dx > 0 &&
      ball.x + BALL_R >= W - 18 &&
      ball.y >= cy &&
      ball.y <= cy + PADDLE_H
    ) {
      const hitPos = (ball.y - cy) / PADDLE_H;
      const angle = (hitPos - 0.5) * Math.PI * 0.6;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.02;
      ball.dx = -Math.abs(speed * Math.cos(angle));
      ball.dy = speed * Math.sin(angle);
    }

    if (ball.x < 0) {
      scoreRef.current.computer++;
      setScore({ ...scoreRef.current });
      resetBall(1);
    } else if (ball.x > W) {
      scoreRef.current.player++;
      setScore({ ...scoreRef.current });
      resetBall(-1);
    }

    draw();
  }, [draw, resetBall]);

  useEffect(() => {
    if (gameState === "playing") {
      const loop = () => {
        gameLoop();
        animRef.current = requestAnimationFrame(loop);
      };
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, gameLoop]);

  const startGame = useCallback(() => {
    scoreRef.current = { player: 0, computer: 0 };
    setScore({ player: 0, computer: 0 });
    playerYRef.current = H / 2 - PADDLE_H / 2;
    computerYRef.current = H / 2 - PADDLE_H / 2;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    setGameState("playing");
  }, [resetBall]);

  useEffect(() => {
    const endGame = () => {
      const total = scoreRef.current.player + scoreRef.current.computer;
      if (total >= 11) {
        setGameState("gameover");
        if (scoreRef.current.player > highScore) setHighScore(scoreRef.current.player);
      }
    };
    if (gameState === "playing") {
      const total = score.player + score.computer;
      if (total >= 11) endGame();
    }
  }, [score, gameState, highScore]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseYRef.current = ((e.clientY - rect.top) / rect.height) * H;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseYRef.current = ((e.touches[0].clientY - rect.top) / rect.height) * H;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Pong</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-blue-400">You: {score.player}</span>
        <span className="text-red-400">Computer: {score.computer}</span>
        <span className="text-gray-500">First to 11</span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Mouse or touch to control paddle</p>
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
          width={W}
          height={H}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="rounded-lg border border-gray-700 cursor-none"
          style={{ maxWidth: "100%" }}
        />
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-2xl font-bold ${score.player >= 11 ? "text-green-400" : "text-red-400"}`}>
              {score.player >= 11 ? "🏆 You Win!" : "😤 Computer Wins!"}
            </p>
            <p className="text-4xl font-bold text-white mt-2">
              {score.player} - {score.computer}
            </p>
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
