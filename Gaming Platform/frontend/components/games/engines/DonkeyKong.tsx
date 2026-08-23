"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 480;
const TILE = 32;
const PLAYER_SIZE = 14;
const BARREL_SIZE = 12;

interface Barrel { x: number; y: number; dx: number; dy: number; vy: number; }

const PLATFORMS = [
  { x: 0, y: 0, w: W, h: 8 },
  { x: 0, y: 80, w: 420, h: 8 },
  { x: 60, y: 160, w: 420, h: 8 },
  { x: 0, y: 240, w: 420, h: 8 },
  { x: 60, y: 320, w: 420, h: 8 },
  { x: 0, y: 400, w: W, h: 8 },
];

export default function DonkeyKong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const playerRef = useRef({ x: 40, y: 460, grounded: true, jumping: false, vy: 0 });
  const barrelsRef = useRef<Barrel[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const barrelTimerRef = useRef(0);
  const jumpHeldRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#854D0E";
    PLATFORMS.forEach((p) => {
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#A16207";
      ctx.fillRect(p.x, p.y, p.w, 3);
    });

    ctx.fillStyle = "#D97706";
    ctx.fillRect(360, 20, 40, 60);
    ctx.fillStyle = "#92400E";
    ctx.fillRect(370, 10, 20, 15);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(365 + i * 12, 25, 8, 40);
    }

    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.arc(40, 440, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFF";
    ctx.fillRect(36, 437, 3, 3);
    ctx.fillRect(42, 437, 3, 3);

    const p = playerRef.current;
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(p.x - PLAYER_SIZE / 2, p.y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(p.x - 3, p.y - PLAYER_SIZE + 2, 6, 4);

    barrelsRef.current.forEach((b) => {
      ctx.fillStyle = "#854D0E";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BARREL_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#451A03";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, H - 10);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${livesRef.current}`, W - 10, H - 10);
  }, []);

  const gameLoop = useCallback(() => {
    const player = playerRef.current;
    const keys = keysRef.current;
    const GRAVITY = 0.5;
    const JUMP_FORCE = -9;
    const MOVE_SPEED = 3;

    if ((keys.has("ArrowLeft") || keys.has("a")) && player.x > PLAYER_SIZE / 2) {
      player.x -= MOVE_SPEED;
    }
    if ((keys.has("ArrowRight") || keys.has("d")) && player.x < W - PLAYER_SIZE / 2) {
      player.x += MOVE_SPEED;
    }

    if ((keys.has("ArrowUp") || keys.has("w") || keys.has(" ")) && player.grounded && !player.jumping) {
      player.vy = JUMP_FORCE;
      player.jumping = true;
      player.grounded = false;
    }

    player.vy += GRAVITY;
    player.y += player.vy;

    player.grounded = false;
    PLATFORMS.forEach((plat) => {
      if (player.x >= plat.x && player.x <= plat.x + plat.w && player.y >= plat.y && player.y <= plat.y + 8 && player.vy >= 0) {
        player.y = plat.y;
        player.vy = 0;
        player.grounded = true;
        player.jumping = false;
      }
    });

    if (player.y > H) {
      livesRef.current--;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        setGameState("gameover");
        if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      }
      player.x = 40;
      player.y = 460;
      player.vy = 0;
    }

    barrelTimerRef.current++;
    if (barrelTimerRef.current > 90) {
      barrelTimerRef.current = 0;
      barrelsRef.current.push({ x: 380, y: 50, dx: -2, dy: 0, vy: 0 });
    }

    barrelsRef.current.forEach((b) => {
      b.x += b.dx;
      b.vy = (b.vy || 0) + GRAVITY;
      b.y += b.dy + (b.vy || 0);

      PLATFORMS.forEach((plat) => {
        if (b.x >= plat.x && b.x <= plat.x + plat.w && b.y >= plat.y && b.y <= plat.y + 10 && (b.vy || 0) >= 0) {
          b.y = plat.y;
          b.vy = 0;
          if (plat.y > 0 && plat.y < H - 10) {
            const slope = (plat.x === 0 ? 1 : -1);
            b.dx = b.dx > 0 ? 2 : -2;
            if (b.x <= plat.x + 5 || b.x >= plat.x + plat.w - 5) {
              b.dx = -b.dx;
            }
          }
        }
      });

      if (b.x < 0) b.x = W;
      if (b.x > W) b.x = 0;
    });

    barrelsRef.current = barrelsRef.current.filter((b) => b.y < H + 20);

    barrelsRef.current.forEach((b) => {
      if (Math.abs(b.x - player.x) < BARREL_SIZE + PLAYER_SIZE / 2 && Math.abs(b.y - player.y) < BARREL_SIZE + PLAYER_SIZE / 2) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
        player.x = 40;
        player.y = 460;
        player.vy = 0;
      }
    });

    if (player.y <= 8) {
      scoreRef.current += 500;
      setScore(scoreRef.current);
      player.x = 40;
      player.y = 460;
      player.vy = 0;
      barrelsRef.current = [];
      barrelTimerRef.current = 0;
    }

    scoreRef.current += 1;
    if (scoreRef.current % 10 === 0) setScore(scoreRef.current);

    draw();
  }, [draw, highScore]);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(function loop() {
        gameLoop();
        animRef.current = requestAnimationFrame(loop);
      });
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, gameLoop]);

  const startGame = useCallback(() => {
    playerRef.current = { x: 40, y: 460, grounded: true, jumping: false, vy: 0 };
    barrelsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    barrelTimerRef.current = 0;
    setScore(0);
    setLives(3);
    setGameState("playing");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === "Enter" && (gameState === "idle" || gameState === "gameover")) startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Donkey Kong</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(lives)}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move, Space/Up to jump. Climb to the top!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onTouchStart={() => { playerRef.current.vy = -9; playerRef.current.jumping = true; }} className="h-12 bg-blue-600 rounded text-white font-bold">JUMP</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowLeft")} onTouchEnd={() => keysRef.current.delete("ArrowLeft")} className="h-12 bg-gray-700 rounded text-white">{"<-"}</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowRight")} onTouchEnd={() => keysRef.current.delete("ArrowRight")} className="h-12 bg-gray-700 rounded text-white">{"->"}</button>
      </div>
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
