"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const W = 320;
const H = 480;
const BIRD_SIZE = 16;
const PIPE_W = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;
const GRAVITY = 0.35;
const JUMP_FORCE = -6.5;

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const birdRef = useRef({ y: H / 2, vy: 0, rot: 0 });
  const pipesRef = useRef<{ x: number; gapY: number; scored: boolean }[]>([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const groundRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1E3A5F");
    grad.addColorStop(0.6, "#87CEEB");
    grad.addColorStop(1, "#2D5016");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#4A7C2E";
    ctx.fillRect(0, H - 20, W, 20);
    groundRef.current = (groundRef.current + PIPE_SPEED) % 24;
    ctx.strokeStyle = "#3D6B25";
    ctx.lineWidth = 1;
    for (let x = -groundRef.current; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, H - 20);
      ctx.lineTo(x + 12, H - 12);
      ctx.lineTo(x + 24, H - 20);
      ctx.stroke();
    }

    const bird = birdRef.current;
    const bx = 60;
    const by = bird.y;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(bird.rot);

    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE, BIRD_SIZE * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.ellipse(0, 2, BIRD_SIZE * 0.8, BIRD_SIZE * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE, -2);
    ctx.lineTo(BIRD_SIZE + 8, 0);
    ctx.lineTo(BIRD_SIZE, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    pipesRef.current.forEach((pipe) => {
      const topH = pipe.gapY;
      const botY = pipe.gapY + PIPE_GAP;

      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
      pipeGrad.addColorStop(0, "#22C55E");
      pipeGrad.addColorStop(0.3, "#4ADE80");
      pipeGrad.addColorStop(0.7, "#22C55E");
      pipeGrad.addColorStop(1, "#16A34A");

      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, PIPE_W, topH);
      ctx.fillRect(pipe.x, botY, PIPE_W, H - botY - 20);

      ctx.fillStyle = "#16A34A";
      ctx.fillRect(pipe.x - 3, topH - 20, PIPE_W + 6, 20);
      ctx.fillRect(pipe.x - 3, botY, PIPE_W + 6, 20);
    });

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(scoreRef.current), W / 2, 50);
  }, []);

  const gameLoop = useCallback(() => {
    const bird = birdRef.current;
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rot = Math.min(Math.max(bird.vy * 3, -30), 90) * (Math.PI / 180);

    if (bird.y <= 0) { bird.y = 0; bird.vy = 0; }
    if (bird.y + BIRD_SIZE >= H - 20) {
      setGameState("gameover");
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      return;
    }

    const bx = 60;
    const by = bird.y;

    pipesRef.current.forEach((pipe) => {
      pipe.x -= PIPE_SPEED;
      if (!pipe.scored && pipe.x + PIPE_W < bx) {
        pipe.scored = true;
        scoreRef.current++;
        setScore(scoreRef.current);
      }
    });

    pipesRef.current = pipesRef.current.filter((p) => p.x > -PIPE_W - 10);

    if (frameRef.current % 90 === 0) {
      const gapY = 40 + Math.random() * (H - PIPE_GAP - 80);
      pipesRef.current.push({ x: W + 10, gapY, scored: false });
    }
    frameRef.current++;

    const birdR = BIRD_SIZE * 0.7;
    for (const pipe of pipesRef.current) {
      if (bx + birdR > pipe.x && bx - birdR < pipe.x + PIPE_W) {
        if (by - birdR < pipe.gapY || by + birdR > pipe.gapY + PIPE_GAP) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
          return;
        }
      }
    }

    draw();
  }, [draw, highScore]);

  useEffect(() => {
    if (gameState === "playing") {
      frameRef.current = 0;
      animRef.current = requestAnimationFrame(function loop() {
        gameLoop();
        animRef.current = requestAnimationFrame(loop);
      });
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, gameLoop]);

  const startGame = useCallback(() => {
    birdRef.current = { y: H / 2, vy: 0, rot: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameState("playing");
  }, []);

  const flap = useCallback(() => {
    if (gameState === "idle") { startGame(); return; }
    if (gameState === "gameover") return;
    birdRef.current.vy = JUMP_FORCE;
  }, [gameState, startGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); flap(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flap]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Flappy Bird</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Best: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={flap}
        onTouchStart={(e) => { e.preventDefault(); flap(); }}
        className="rounded-lg border border-gray-700 cursor-pointer"
        style={{ maxWidth: "100%" }}
      />
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
