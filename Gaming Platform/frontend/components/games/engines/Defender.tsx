"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 400;
const PLAYER_SIZE = 20;
const BULLET_SPEED = 6;

interface Bullet { x: number; y: number; dy: number; }
interface Enemy { x: number; y: number; alive: boolean; }
interface Human { x: number; y: number; saved: boolean; }

export default function Defender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const playerRef = useRef({ x: W / 2, y: H - 60 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const humansRef = useRef<Human[]>([]);
  const scrollRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef(0);

  const initEntities = useCallback(() => {
    const enemies: Enemy[] = [];
    const humans: Human[] = [];
    for (let i = 0; i < 8; i++) {
      enemies.push({ x: Math.random() * W, y: 50 + Math.random() * (H - 120), alive: true });
    }
    for (let i = 0; i < 5; i++) {
      humans.push({ x: 50 + Math.random() * (W - 100), y: H - 40, saved: false });
    }
    enemiesRef.current = enemies;
    humansRef.current = humans;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0B1622";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * W, (Math.random() * H + scrollRef.current) % H, 1, 1);
    }

    ctx.fillStyle = "#1E3A8A";
    ctx.fillRect(0, H - 20, W, 20);

    humansRef.current.forEach((h) => {
      if (h.saved) return;
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(h.x - 3, h.y - 12, 6, 12);
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(h.x, h.y - 16, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const p = playerRef.current;
    ctx.fillStyle = "#38BDF8";
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillRect(-PLAYER_SIZE, -6, PLAYER_SIZE * 2, 12);
    ctx.fillStyle = "#60A5FA";
    ctx.fillRect(PLAYER_SIZE - 5, -4, 8, 8);
    ctx.restore();

    bulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(b.x - 1, b.y, 2, 8);
    });

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 8);
      ctx.lineTo(e.x - 10, e.y + 5);
      ctx.lineTo(e.x, e.y);
      ctx.lineTo(e.x + 10, e.y + 5);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${livesRef.current}`, W - 10, 20);
  }, []);

  const gameLoop = useCallback(() => {
    const player = playerRef.current;
    const keys = keysRef.current;

    if (keys.has("ArrowLeft") || keys.has("a")) player.x = Math.max(PLAYER_SIZE, player.x - 4);
    if (keys.has("ArrowRight") || keys.has("d")) player.x = Math.min(W - PLAYER_SIZE, player.x + 4);
    if (keys.has("ArrowUp") || keys.has("w")) player.y = Math.max(30, player.y - 3);
    if (keys.has("ArrowDown") || keys.has("s")) player.y = Math.min(H - 30, player.y + 3);

    bulletsRef.current.forEach((b) => { b.y += b.dy; });
    bulletsRef.current = bulletsRef.current.filter((b) => b.y > -10 && b.y < H + 10);

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      e.x += Math.sin(Date.now() / 500 + e.x) * 2;
      e.y += Math.cos(Date.now() / 700 + e.y) * 1.5;
      e.x = Math.max(10, Math.min(W - 10, e.x));
      e.y = Math.max(30, Math.min(H - 40, e.y));
    });

    const bToRemove: number[] = [];
    enemiesRef.current.forEach((enemy, ei) => {
      if (!enemy.alive) return;
      bulletsRef.current.forEach((bullet, bi) => {
        if (Math.abs(bullet.x - enemy.x) < 15 && Math.abs(bullet.y - enemy.y) < 15) {
          enemiesRef.current[ei].alive = false;
          bToRemove.push(bi);
          scoreRef.current += 25;
          setScore(scoreRef.current);
        }
      });
    });
    bulletsRef.current = bulletsRef.current.filter((_, i) => !bToRemove.includes(i));

    humansRef.current.forEach((h) => {
      if (h.saved) return;
      if (Math.abs(h.x - player.x) < 20 && Math.abs(h.y - player.y) < 15) {
        h.saved = true;
        scoreRef.current += 100;
        setScore(scoreRef.current);
      }
    });

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x - player.x) < 20 && Math.abs(e.y - player.y) < 15) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
        e.alive = false;
      }
    });

    if (enemiesRef.current.every((e) => !e.alive)) {
      initEntities();
      scoreRef.current += 200;
      setScore(scoreRef.current);
    }

    if (Math.random() < 0.02) {
      enemiesRef.current.push({
        x: Math.random() * W,
        y: Math.random() < 0.5 ? 20 : H - 40,
        alive: true,
      });
    }

    draw();
  }, [draw, highScore, initEntities]);

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
    playerRef.current = { x: W / 2, y: H - 60 };
    bulletsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    scrollRef.current = 0;
    setScore(0);
    setLives(3);
    initEntities();
    setGameState("playing");
  }, [initEntities]);

  const shoot = useCallback((dy: number) => {
    if (gameState !== "playing") return;
    const now = Date.now();
    if (now - lastShotRef.current < 150) return;
    lastShotRef.current = now;
    bulletsRef.current.push({ x: playerRef.current.x + PLAYER_SIZE, y: playerRef.current.y, dy });
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.code === "Space") { e.preventDefault(); shoot(-BULLET_SPEED); }
      if (e.key === "x") shoot(BULLET_SPEED);
      if (e.key === "Enter" && (gameState === "idle" || gameState === "gameover")) startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [shoot, gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Defender</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move. Space = shoot up, X = shoot down. Rescue humans!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} onClick={() => shoot(-BULLET_SPEED)} />
      )}
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
