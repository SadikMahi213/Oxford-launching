"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 400;
const SHIP_SIZE = 12;
const THRUST = 0.12;
const FRICTION = 0.99;
const ROT_SPEED = 0.07;
const BULLET_SPEED = 6;
const BULLET_LIFE = 60;
const ASTEROID_SPEED_BASE = 1.0;
const ASTEROID_SIZES = [40, 20, 10];
const ASTEROID_SCORE = [20, 50, 100];

interface Vec { x: number; y: number; }
interface Bullet { x: number; y: number; dx: number; dy: number; life: number; }
interface Asteroid { x: number; y: number; dx: number; dy: number; size: number; r: number; vertices: number[]; }

function wrap(v: number, max: number): number {
  if (v < 0) return v + max;
  if (v > max) return v - max;
  return v;
}

function createAsteroid(x: number, y: number, sizeIdx: number): Asteroid {
  const angle = Math.random() * Math.PI * 2;
  const speed = ASTEROID_SPEED_BASE * (1 + Math.random());
  const r = ASTEROID_SIZES[sizeIdx];
  const vertices = Array.from({ length: 8 }, () => 0.7 + Math.random() * 0.6);
  return { x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, size: sizeIdx, r, vertices };
}

function splitAsteroid(a: Asteroid): Asteroid[] {
  if (a.size >= 2) return [];
  return [createAsteroid(a.x, a.y, a.size + 1), createAsteroid(a.x, a.y, a.size + 1)];
}

export default function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const shipRef = useRef({ x: W / 2, y: H / 2, angle: -Math.PI / 2, dx: 0, dy: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const invulnRef = useRef(0);
  const shootCooldownRef = useRef(0);

  const initAsteroids = useCallback((count: number) => {
    const asteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - W / 2, y - H / 2) < 100);
      asteroids.push(createAsteroid(x, y, 0));
    }
    asteroidsRef.current = asteroids;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.05})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }

    const ship = shipRef.current;
    const flash = invulnRef.current > 0 && Math.floor(invulnRef.current / 4) % 2 === 0;
    if (!flash) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHIP_SIZE, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
      ctx.lineTo(-SHIP_SIZE * 0.4, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    bulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    asteroidsRef.current.forEach((a) => {
      ctx.strokeStyle = "#9CA3AF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < a.vertices.length; i++) {
        const ang = (Math.PI * 2 / a.vertices.length) * i;
        const px = a.x + Math.cos(ang) * a.r * a.vertices[i];
        const py = a.y + Math.sin(ang) * a.r * a.vertices[i];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${livesRef.current}`, W - 10, 20);
  }, []);

  const gameLoop = useCallback(() => {
    const ship = shipRef.current;
    const keys = keysRef.current;

    if (keys.has("ArrowLeft") || keys.has("a")) ship.angle -= ROT_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) ship.angle += ROT_SPEED;
    if (keys.has("ArrowUp") || keys.has("w")) {
      ship.dx += Math.cos(ship.angle) * THRUST;
      ship.dy += Math.sin(ship.angle) * THRUST;
    }

    ship.dx *= FRICTION;
    ship.dy *= FRICTION;
    ship.x = wrap(ship.x + ship.dx, W);
    ship.y = wrap(ship.y + ship.dy, H);

    if (shootCooldownRef.current > 0) shootCooldownRef.current--;
    if ((keys.has(" ") || keys.has("Space")) && shootCooldownRef.current <= 0) {
      shootCooldownRef.current = 10;
      bulletsRef.current.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
        dx: Math.cos(ship.angle) * BULLET_SPEED + ship.dx * 0.5,
        dy: Math.sin(ship.angle) * BULLET_SPEED + ship.dy * 0.5,
        life: BULLET_LIFE,
      });
    }

    bulletsRef.current.forEach((b) => { b.x += b.dx; b.y += b.dy; b.x = wrap(b.x, W); b.y = wrap(b.y, H); b.life--; });
    bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

    asteroidsRef.current.forEach((a) => {
      a.x = wrap(a.x + a.dx, W);
      a.y = wrap(a.y + a.dy, H);
    });

    const bToRemove: number[] = [];
    const aToRemove: Set<number> = new Set();
    asteroidsRef.current.forEach((a, ai) => {
      bulletsRef.current.forEach((b, bi) => {
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          bToRemove.push(bi);
          aToRemove.add(ai);
          scoreRef.current += ASTEROID_SCORE[a.size];
          setScore(scoreRef.current);
        }
      });
    });

    const newAsteroids: Asteroid[] = [];
    aToRemove.forEach((ai) => { newAsteroids.push(...splitAsteroid(asteroidsRef.current[ai])); });
    asteroidsRef.current = asteroidsRef.current.filter((_, i) => !aToRemove.has(i));
    asteroidsRef.current.push(...newAsteroids);
    bulletsRef.current = bulletsRef.current.filter((_, i) => !bToRemove.includes(i));

    if (invulnRef.current > 0) invulnRef.current--;

    if (invulnRef.current <= 0) {
      for (let i = asteroidsRef.current.length - 1; i >= 0; i--) {
        const a = asteroidsRef.current[i];
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + SHIP_SIZE * 0.5) {
          livesRef.current--;
          setLives(livesRef.current);
          asteroidsRef.current.splice(i, 1);
          asteroidsRef.current.push(...splitAsteroid(a));
          invulnRef.current = 120;
          if (livesRef.current <= 0) {
            setGameState("gameover");
            if (scoreRef.current > highScore) setHighScore(scoreRef.current);
          }
          ship.x = W / 2;
          ship.y = H / 2;
          ship.dx = 0;
          ship.dy = 0;
          break;
        }
      }
    }

    if (asteroidsRef.current.length === 0) {
      initAsteroids(Math.min(12, 4 + Math.floor(scoreRef.current / 200)));
    }

    draw();
  }, [draw, highScore, initAsteroids]);

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
    shipRef.current = { x: W / 2, y: H / 2, angle: -Math.PI / 2, dx: 0, dy: 0 };
    bulletsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    invulnRef.current = 120;
    setScore(0);
    setLives(3);
    initAsteroids(5);
    setGameState("playing");
  }, [initAsteroids]);

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
      <h1 className="text-2xl font-bold text-white">Asteroids</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to fly, Space to shoot</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onClick={() => { keysRef.current.add("ArrowUp"); setTimeout(() => keysRef.current.delete("ArrowUp"), 150); }} className="h-12 bg-blue-600 rounded text-white font-bold">UP</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowLeft")} onTouchEnd={() => keysRef.current.delete("ArrowLeft")} className="h-12 bg-gray-700 rounded text-white">{"<-"}</button>
        <button onClick={() => { keysRef.current.add(" "); setTimeout(() => keysRef.current.delete(" "), 50); }} className="h-12 bg-yellow-600 rounded text-white font-bold">FIRE</button>
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
