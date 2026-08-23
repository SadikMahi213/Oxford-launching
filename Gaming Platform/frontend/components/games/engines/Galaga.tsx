"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 480;
const PLAYER_SIZE = 16;
const BULLET_SPEED = 7;
const ENEMY_SIZE = 20;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_PAD = 8;

interface Bullet { x: number; y: number; }
interface Enemy { x: number; y: number; alive: boolean; }

export default function Galaga() {
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
  const enemyTickRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef(0);

  const initEnemies = useCallback((w: number) => {
    const enemies: Enemy[] = [];
    const rows = Math.min(ENEMY_ROWS + Math.floor(w / 3), 7);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({
          x: 40 + c * (ENEMY_SIZE + ENEMY_PAD),
          y: 40 + r * (ENEMY_SIZE + ENEMY_PAD),
          alive: true,
        });
      }
    }
    enemiesRef.current = enemies;
    enemyDirRef.current = 1;
    enemyTickRef.current = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0B1120";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }

    ctx.fillStyle = "#10B981";
    const px = playerXRef.current;
    ctx.beginPath();
    ctx.moveTo(px, H - 30);
    ctx.lineTo(px - PLAYER_SIZE, H - 10);
    ctx.lineTo(px - PLAYER_SIZE * 0.5, H - 15);
    ctx.lineTo(px + PLAYER_SIZE * 0.5, H - 15);
    ctx.lineTo(px + PLAYER_SIZE, H - 10);
    ctx.closePath();
    ctx.fill();

    bulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(b.x - 1.5, b.y, 3, 10);
    });

    enemiesRef.current.forEach((e, i) => {
      if (!e.alive) return;
      const row = Math.floor(i / ENEMY_COLS);
      const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#8B5CF6"];
      ctx.fillStyle = colors[row % colors.length];
      const wobble = Math.sin(Date.now() / 200 + i) * 2;
      ctx.beginPath();
      ctx.arc(e.x + ENEMY_SIZE / 2, e.y + ENEMY_SIZE / 2 + wobble, ENEMY_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(e.x + 4, e.y + ENEMY_SIZE / 2 + wobble - 3, ENEMY_SIZE - 8, 6);
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
    if (keys.has("ArrowLeft") || keys.has("a")) playerXRef.current = Math.max(PLAYER_SIZE, playerXRef.current - 4);
    if (keys.has("ArrowRight") || keys.has("d")) playerXRef.current = Math.min(W - PLAYER_SIZE, playerXRef.current + 4);

    bulletsRef.current.forEach((b) => { b.y -= BULLET_SPEED; });
    bulletsRef.current = bulletsRef.current.filter((b) => b.y > -10);

    enemyTickRef.current++;
    const moveInterval = Math.max(20, 60 - wave * 3);
    if (enemyTickRef.current % moveInterval === 0) {
      const enemies = enemiesRef.current.filter((e) => e.alive);
      if (enemies.length > 0) {
        let hitEdge = false;
        enemies.forEach((e) => {
          e.x += enemyDirRef.current * (8 + wave);
          if (e.x <= 5 || e.x + ENEMY_SIZE >= W - 5) hitEdge = true;
        });
        if (hitEdge) {
          enemyDirRef.current *= -1;
          enemies.forEach((e) => { e.y += 12; });
        }
      }
    }

    const bToRemove: number[] = [];
    enemiesRef.current.forEach((enemy, ei) => {
      if (!enemy.alive) return;
      bulletsRef.current.forEach((bullet, bi) => {
        if (bullet.x >= enemy.x && bullet.x <= enemy.x + ENEMY_SIZE && bullet.y >= enemy.y && bullet.y <= enemy.y + ENEMY_SIZE) {
          enemiesRef.current[ei].alive = false;
          bToRemove.push(bi);
          scoreRef.current += 10;
          setScore(scoreRef.current);
        }
      });
    });
    bulletsRef.current = bulletsRef.current.filter((_, i) => !bToRemove.includes(i));

    if (enemiesRef.current.every((e) => !e.alive)) {
      const newWave = wave + 1;
      setWave(newWave);
      initEnemies(newWave);
      bulletsRef.current = [];
    }

    if (Math.random() < 0.015 * wave) {
      const alive = enemiesRef.current.filter((e) => e.alive);
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        const px = playerXRef.current;
        const dx = (px - (shooter.x + ENEMY_SIZE / 2)) * 0.02;
        bulletsRef.current.push({ x: shooter.x + ENEMY_SIZE / 2, y: shooter.y + ENEMY_SIZE });
      }
    }

    const px = playerXRef.current;
    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x + ENEMY_SIZE / 2 - px) < PLAYER_SIZE + ENEMY_SIZE / 2 && Math.abs(e.y - (H - 30)) < ENEMY_SIZE) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
        e.alive = false;
      }
    });

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
    if (now - lastShotRef.current < 200) return;
    lastShotRef.current = now;
    bulletsRef.current.push({ x: playerXRef.current, y: H - 30 });
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
      <h1 className="text-2xl font-bold text-white">Galaga</h1>
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
