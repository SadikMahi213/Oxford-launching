"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 480;
const TILE = 32;
const FROG_SIZE = 12;
const LANES = 15;
const LANE_H = TILE;

interface Vehicle { x: number; speed: number; w: number; color: string; }
interface Log { x: number; speed: number; w: number; }

const VEHICLE_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#F97316", "#8B5CF6"];

export default function Frogger() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const frogRef = useRef({ x: W / 2, y: H - TILE });
  const vehiclesRef = useRef<Vehicle[][]>([]);
  const logsRef = useRef<Log[][]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const initObjects = useCallback(() => {
    const vehicles: Vehicle[][] = [];
    const logs: Log[][] = [];
    for (let i = 0; i < 5; i++) {
      const lane: Vehicle[] = [];
      const count = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < count; j++) {
        lane.push({
          x: (W / count) * j + Math.random() * 60,
          speed: (1 + Math.random() * 2) * (i % 2 === 0 ? 1 : -1),
          w: 30 + Math.random() * 40,
          color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
        });
      }
      vehicles.push(lane);
    }
    for (let i = 0; i < 5; i++) {
      const lane: Log[] = [];
      const count = 2 + Math.floor(Math.random());
      for (let j = 0; j < count; j++) {
        lane.push({
          x: (W / count) * j,
          speed: (1.5 + Math.random()) * (i % 2 === 0 ? 1 : -1),
          w: 80 + Math.random() * 60,
        });
      }
      logs.push(lane);
    }
    vehiclesRef.current = vehicles;
    logsRef.current = logs;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 5; i++) {
      const y = i * LANE_H + TILE * 5;
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, y, W, LANE_H);
      logsRef.current[i]?.forEach((log) => {
        ctx.fillStyle = "#92400E";
        ctx.fillRect(log.x, y + 4, log.w, LANE_H - 8);
        ctx.fillStyle = "#78350F";
        ctx.fillRect(log.x, y + 2, log.w, 4);
      });
    }

    for (let i = 0; i < 5; i++) {
      const y = H - (i + 1) * LANE_H;
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, y, W, LANE_H);
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, y + LANE_H / 2 - 1, W, 2);
      vehiclesRef.current[i]?.forEach((v) => {
        ctx.fillStyle = v.color;
        ctx.fillRect(v.x, y + 6, v.w, LANE_H - 12);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(v.x + 4, y + 10, 6, 4);
        ctx.fillRect(v.x + v.w - 10, y + 10, 6, 4);
      });
    }

    ctx.fillStyle = "#22C55E";
    ctx.fillRect(0, 0, W, TILE);
    ctx.fillStyle = "#16A34A";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i * 60 + 10, 8, 40, TILE - 16);
    }

    ctx.fillStyle = "#365314";
    ctx.fillRect(0, H - TILE, W, TILE);

    const frog = frogRef.current;
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.arc(frog.x, frog.y, FROG_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFF";
    ctx.fillRect(frog.x - 5, frog.y - 4, 4, 4);
    ctx.fillRect(frog.x + 2, frog.y - 4, 4, 4);
    ctx.fillStyle = "#000";
    ctx.fillRect(frog.x - 4, frog.y - 3, 2, 2);
    ctx.fillRect(frog.x + 3, frog.y - 3, 2, 2);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, H - 4);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${livesRef.current}`, W - 10, H - 4);
  }, []);

  const gameLoop = useCallback(() => {
    const frog = frogRef.current;
    const keys = keysRef.current;

    vehiclesRef.current.forEach((lane) => {
      lane.forEach((v) => {
        v.x += v.speed;
        if (v.speed > 0 && v.x > W) v.x = -v.w;
        if (v.speed < 0 && v.x + v.w < 0) v.x = W;
      });
    });

    logsRef.current.forEach((lane) => {
      lane.forEach((log) => {
        log.x += log.speed;
        if (log.speed > 0 && log.x > W) log.x = -log.w;
        if (log.speed < 0 && log.x + log.w < 0) log.x = W;
      });
    });

    const frogY = frog.y;
    const inRoad = frogY > TILE && frogY < H - TILE;
    const inWater = frogY > TILE && frogY < TILE * 6;

    if (inRoad) {
      const laneIdx = Math.floor((H - frog.y) / LANE_H) - 1;
      if (laneIdx >= 0 && laneIdx < 5) {
        const laneY = H - (laneIdx + 1) * LANE_H;
        vehiclesRef.current[laneIdx]?.forEach((v) => {
          if (Math.abs(frog.x - (v.x + v.w / 2)) < (v.w / 2 + FROG_SIZE)) {
            if (Math.abs(frog.y - laneY) < LANE_H / 2) {
              livesRef.current--;
              setLives(livesRef.current);
              if (livesRef.current <= 0) {
                setGameState("gameover");
                if (scoreRef.current > highScore) setHighScore(scoreRef.current);
              }
              frog.x = W / 2;
              frog.y = H - TILE;
            }
          }
        });
      }
    }

    if (inWater) {
      const laneIdx = Math.floor((frog.y - TILE) / LANE_H);
      let onLog = false;
      if (laneIdx >= 0 && laneIdx < 5) {
        logsRef.current[laneIdx]?.forEach((log) => {
          if (frog.x >= log.x && frog.x <= log.x + log.w) {
            onLog = true;
            frog.x += log.speed;
          }
        });
      }
      if (!onLog) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
        frog.x = W / 2;
        frog.y = H - TILE;
      }
      if (frog.x < 0 || frog.x > W) {
        livesRef.current--;
        setLives(livesRef.current);
        frog.x = W / 2;
        frog.y = H - TILE;
      }
    }

    if (frog.y <= TILE) {
      scoreRef.current += 100;
      setScore(scoreRef.current);
      frog.x = W / 2;
      frog.y = H - TILE;
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

  const startGame = useCallback(() => {
    frogRef.current = { x: W / 2, y: H - TILE };
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    initObjects();
    setGameState("playing");
  }, [initObjects]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      const frog = frogRef.current;
      const step = TILE;
      if (e.key === "ArrowUp" || e.key === "w") frog.y = Math.max(TILE / 2, frog.y - step);
      if (e.key === "ArrowDown" || e.key === "s") frog.y = Math.min(H - TILE / 2, frog.y + step);
      if (e.key === "ArrowLeft" || e.key === "a") frog.x = Math.max(FROG_SIZE, frog.x - step);
      if (e.key === "ArrowRight" || e.key === "d") frog.x = Math.min(W - FROG_SIZE, frog.x + step);
      if (e.key === "Enter" && (gameState === "idle" || gameState === "gameover")) startGame();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Frogger</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(lives)}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to hop across roads and rivers</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onTouchStart={() => { frogRef.current.y = Math.max(TILE / 2, frogRef.current.y - TILE); }} className="h-12 bg-gray-700 rounded text-white">UP</button>
        <div />
        <button onTouchStart={() => { frogRef.current.x = Math.max(FROG_SIZE, frogRef.current.x - TILE); }} className="h-12 bg-gray-700 rounded text-white">{"<-"}</button>
        <div />
        <button onTouchStart={() => { frogRef.current.x = Math.min(W - FROG_SIZE, frogRef.current.x + TILE); }} className="h-12 bg-gray-700 rounded text-white">{"->"}</button>
        <div />
        <button onTouchStart={() => { frogRef.current.y = Math.min(H - TILE / 2, frogRef.current.y + TILE); }} className="h-12 bg-gray-700 rounded text-white">DOWN</button>
        <div />
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
