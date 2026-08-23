"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 400;
const CITY_COUNT = 6;
const MISSILE_SPEED_BASE = 1.5;

interface Missile { x: number; y: number; tx: number; ty: number; speed: number; active: boolean; }
interface Explosion { x: number; y: number; r: number; maxR: number; }
interface City { x: number; alive: boolean; }

export default function MissileCommand() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const tickRef = useRef(0);

  const initCities = useCallback(() => {
    const cities: City[] = [];
    const spacing = W / (CITY_COUNT + 1);
    for (let i = 0; i < CITY_COUNT; i++) {
      cities.push({ x: spacing * (i + 1), alive: true });
    }
    citiesRef.current = cities;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0B0B1A";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillRect(0, H - 50, W, 50);

    citiesRef.current.forEach((c) => {
      if (!c.alive) return;
      ctx.fillStyle = "#6B7280";
      ctx.fillRect(c.x - 15, H - 80, 30, 30);
      ctx.fillStyle = "#9CA3AF";
      ctx.fillRect(c.x - 10, H - 75, 8, 20);
      ctx.fillRect(c.x + 2, H - 70, 8, 15);
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(c.x - 12, H - 85, 6, 4);
      ctx.fillRect(c.x + 6, H - 80, 4, 3);
    });

    ctx.fillStyle = "#374151";
    [W * 0.2, W * 0.5, W * 0.8].forEach((x) => {
      ctx.fillRect(x - 5, H - 60, 10, 10);
    });

    missilesRef.current.forEach((m) => {
      if (!m.active) return;
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(m.x, m.ty < m.y ? 0 : H);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    explosionsRef.current.forEach((e) => {
      const alpha = 1 - e.r / e.maxR;
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`Level: ${levelRef.current}`, W - 10, 20);
  }, []);

  const gameLoop = useCallback(() => {
    tickRef.current++;

    const spawnRate = Math.max(30, 80 - levelRef.current * 5);
    if (tickRef.current % spawnRate === 0) {
      const tx = citiesRef.current.filter((c) => c.alive);
      if (tx.length > 0) {
        const target = tx[Math.floor(Math.random() * tx.length)];
        missilesRef.current.push({
          x: 20 + Math.random() * (W - 40),
          y: -5,
          tx: target.x,
          ty: H - 65,
          speed: MISSILE_SPEED_BASE + levelRef.current * 0.2,
          active: true,
        });
      }
    }

    missilesRef.current.forEach((m) => {
      if (!m.active) return;
      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist < m.speed) {
        m.x = m.tx;
        m.y = m.ty;
        m.active = false;
        explosionsRef.current.push({ x: m.x, y: m.y, r: 5, maxR: 30 });
        citiesRef.current.forEach((c) => {
          if (c.alive && Math.abs(c.x - m.x) < 20) {
            c.alive = false;
          }
        });
      } else {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
      }
    });
    missilesRef.current = missilesRef.current.filter((m) => m.active);

    explosionsRef.current.forEach((e) => { e.r += 1.5; });
    const exploding = new Set<number>();
    explosionsRef.current.forEach((e, i) => {
      if (e.r >= e.maxR) exploding.add(i);
    });
    explosionsRef.current = explosionsRef.current.filter((_, i) => !exploding.has(i));

    missilesRef.current = missilesRef.current.filter((m) => {
      if (!m.active) return false;
      for (const e of explosionsRef.current) {
        if (Math.hypot(m.x - e.x, m.y - e.y) < e.r + 10) {
          scoreRef.current += 25;
          setScore(scoreRef.current);
          return false;
        }
      }
      return true;
    });

    if (missilesRef.current.length === 0 && tickRef.current > 60 && tickRef.current % 60 === 0) {
      const allDead = citiesRef.current.every((c) => !c.alive);
      if (allDead) {
        setGameState("gameover");
        if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      } else {
        levelRef.current++;
        setLevel(levelRef.current);
        tickRef.current = 0;
      }
    }

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

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    explosionsRef.current.push({ x, y, r: 5, maxR: 40 });
  }, [gameState]);

  const startGame = useCallback(() => {
    missilesRef.current = [];
    explosionsRef.current = [];
    scoreRef.current = 0;
    levelRef.current = 1;
    tickRef.current = 0;
    setScore(0);
    setLevel(1);
    initCities();
    setGameState("playing");
  }, [initCities]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (gameState === "idle" || gameState === "gameover")) startGame();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Missile Command</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Click to create explosions and destroy incoming missiles</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} onClick={handleClick} className="rounded-lg border border-gray-700 cursor-crosshair" style={{ maxWidth: "100%" }} />
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
            <p className="text-gray-400">Level {level}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
