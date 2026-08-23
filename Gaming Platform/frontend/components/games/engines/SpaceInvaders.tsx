"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 400;
const PLAYER_SIZE = 20;
const BULLET_SPEED = 6;
const ENEMY_SIZE = 24;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_PAD = 6;
const ENEMY_SPEED_BASE = 0.5;

interface Bullet { x: number; y: number; dy: number; }
interface Enemy { x: number; y: number; alive: boolean; }

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const playerXRef = useRef(W / 2);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyDirRef = useRef(1);
  const enemySpeedRef = useRef(ENEMY_SPEED_BASE);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const lastShotRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());

  const initEnemies = useCallback((waveNum: number) => {
    const enemies: Enemy[] = [];
    const startY = 30 + (waveNum - 1) * 10;
    for (let r = 0; r < ENEMY_ROWS; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({
          x: 30 + c * (ENEMY_SIZE + ENEMY_PAD),
          y: startY + r * (ENEMY_SIZE + ENEMY_PAD),
          alive: true,
        });
      }
    }
    enemiesRef.current = enemies;
    enemyDirRef.current = 1;
    enemySpeedRef.current = ENEMY_SPEED_BASE + waveNum * 0.2;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }

    ctx.fillStyle = "#22C55E";
    const px = playerXRef.current;
    ctx.beginPath();
    ctx.moveTo(px, H - 30);
    ctx.lineTo(px - PLAYER_SIZE, H - 10);
    ctx.lineTo(px + PLAYER_SIZE, H - 10);
    ctx.closePath();
    ctx.fill();

    bulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(b.x - 1, b.y, 2, 8);
    });

    enemyBulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(b.x - 1, b.y, 2, 8);
    });

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      const color = wave % 3 === 0 ? "#EC4899" : wave % 2 === 0 ? "#8B5CF6" : "#3B82F6";
      ctx.fillStyle = color;
      ctx.fillRect(e.x, e.y, ENEMY_SIZE, ENEMY_SIZE);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(e.x + 2, e.y + 2, ENEMY_SIZE - 4, 6);
      ctx.fillStyle = "#FFF";
      ctx.fillRect(e.x + 4, e.y + 8, 4, 4);
      ctx.fillRect(e.x + ENEMY_SIZE - 8, e.y + 8, 4, 4);
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`Wave: ${wave}`, W - 10, 20);
  }, [wave]);

  const gameLoop = useCallback(() => {
    const keys = keysRef.current;
    if (keys.has("ArrowLeft") || keys.has("a")) {
      playerXRef.current = Math.max(PLAYER_SIZE, playerXRef.current - 4);
    }
    if (keys.has("ArrowRight") || keys.has("d")) {
      playerXRef.current = Math.min(W - PLAYER_SIZE, playerXRef.current + 4);
    }

    bulletsRef.current.forEach((b) => { b.y -= BULLET_SPEED; });
    bulletsRef.current = bulletsRef.current.filter((b) => b.y > -10);

    enemyBulletsRef.current.forEach((b) => { b.y += 4; });
    enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => b.y < H + 10);

    const enemies = enemiesRef.current;
    let hitEdge = false;
    enemies.forEach((e) => {
      if (!e.alive) return;
      e.x += enemySpeedRef.current * enemyDirRef.current;
      if (e.x <= 5 || e.x + ENEMY_SIZE >= W - 5) hitEdge = true;
    });

    if (hitEdge) {
      enemyDirRef.current *= -1;
      enemies.forEach((e) => { if (e.alive) e.y += 15; });
    }

    const bulletsToRemove: number[] = [];
    enemies.forEach((enemy, ei) => {
      if (!enemy.alive) return;
      bulletsRef.current.forEach((bullet, bi) => {
        if (
          bullet.x >= enemy.x && bullet.x <= enemy.x + ENEMY_SIZE &&
          bullet.y >= enemy.y && bullet.y <= enemy.y + ENEMY_SIZE
        ) {
          enemiesRef.current[ei].alive = false;
          bulletsToRemove.push(bi);
          scoreRef.current += 10;
          setScore(scoreRef.current);
        }
      });
    });
    bulletsRef.current = bulletsRef.current.filter((_, i) => !bulletsToRemove.includes(i));

    const px = playerXRef.current;
    const ebToRemove: number[] = [];
    enemyBulletsRef.current.forEach((b, i) => {
      if (Math.abs(b.x - px) < PLAYER_SIZE && b.y >= H - 30 && b.y <= H - 10) {
        ebToRemove.push(i);
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
      }
    });
    enemyBulletsRef.current = enemyBulletsRef.current.filter((_, i) => !ebToRemove.includes(i));

    if (enemies.every((e) => !e.alive)) {
      const newWave = wave + 1;
      setWave(newWave);
      initEnemies(newWave);
      enemyBulletsRef.current = [];
    }

    if (Math.random() < 0.02) {
      const alive = enemies.filter((e) => e.alive);
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        enemyBulletsRef.current.push({
          x: shooter.x + ENEMY_SIZE / 2,
          y: shooter.y + ENEMY_SIZE,
          dy: 4,
        });
      }
    }

    draw();
  }, [draw, highScore, wave, initEnemies]);

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
    playerXRef.current = W / 2;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setWave(1);
    initEnemies(1);
    setGameState("playing");
  }, [initEnemies]);

  const shoot = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();
    if (now - lastShotRef.current < 250) return;
    lastShotRef.current = now;
    bulletsRef.current.push({ x: playerXRef.current, y: H - 30, dy: -BULLET_SPEED });
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.code === "Space") { e.preventDefault(); shoot(); }
      if (e.key === "Enter" && (gameState === "idle" || gameState === "gameover")) startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [shoot, gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Space Invaders</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(lives)}</span></span>
        <span className="text-gray-400">Wave: <span className="text-blue-400 font-bold">{wave}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move, Space to shoot</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} onClick={shoot} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onClick={shoot} className="h-12 bg-yellow-600 rounded text-white font-bold">FIRE</button>
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
            <p className="text-gray-400">Wave {wave}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
