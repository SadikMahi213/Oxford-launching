"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 448;
const H = 504;
const TILE = 16;
const COLS = 28;
const ROWS = 28;
const PAC_R = 6;

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
  [0,0,0,0,0,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,1,0,1,1,1,3,3,1,1,1,0,1,1,0,1,0,0,0,0,0],
  [1,1,1,1,1,1,0,1,1,0,1,3,3,3,3,3,3,1,0,1,1,0,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,0,1,1,0,1,3,3,3,3,3,3,1,0,1,1,0,1,1,1,1,1,1],
  [0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0],
  [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

interface Ghost { x: number; y: number; dx: number; dy: number; color: string; eaten: boolean; }

export default function Pacman() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const pacRef = useRef({ x: 14, y: 23, dx: 0, dy: 0, mouthAngle: 0, mouthDir: 1 });
  const dotsRef = useRef<number[][]>([]);
  const ghostsRef = useRef<Ghost[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const moveQueueRef = useRef<{dx:number;dy:number}>({dx:0,dy:0});
  const scareTimerRef = useRef(0);

  const initDots = useCallback(() => {
    const dots: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 0) dots.push([c, r]);
        if (MAP[r][c] === 2) dots.push([c, r]);
      }
    }
    dotsRef.current = dots;
  }, []);

  const initGhosts = useCallback(() => {
    const colors = ["#EF4444", "#FB923C", "#A855F7", "#22D3EE"];
    ghostsRef.current = colors.map((color, i) => ({
      x: 13 + (i % 2), y: 11 + Math.floor(i / 2), dx: i % 2 === 0 ? 1 : -1, dy: 0, color, eaten: false,
    }));
  }, []);

  const canMove = useCallback((x: number, y: number) => {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    return MAP[y][x] !== 1;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 1) {
          ctx.fillStyle = "#1E3A8A";
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1;
          ctx.strokeRect(c * TILE + 0.5, r * TILE + 0.5, TILE - 1, TILE - 1);
        }
        if (MAP[r][c] === 3) {
          ctx.fillStyle = "#FBBF24";
          ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
        }
      }
    }

    dotsRef.current.forEach(([x, y]) => {
      ctx.fillStyle = MAP[y][x] === 2 ? "#FBBF24" : "#FFF";
      ctx.beginPath();
      const r = MAP[y][x] === 2 ? 4 : 2;
      ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, r, 0, Math.PI * 2);
      ctx.fill();
    });

    const pac = pacRef.current;
    const mouth = pac.mouthAngle;
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    const px = pac.x * TILE + TILE / 2;
    const py = pac.y * TILE + TILE / 2;
    const dir = Math.atan2(pac.dy, pac.dx);
    ctx.moveTo(px, py);
    ctx.arc(px, py, PAC_R, dir - mouth, dir + mouth);
    ctx.closePath();
    ctx.fill();

    ghostsRef.current.forEach((g) => {
      if (g.eaten && scareTimerRef.current <= 0) return;
      const gx = g.x * TILE + TILE / 2;
      const gy = g.y * TILE + TILE / 2;
      if (scareTimerRef.current > 0) {
        ctx.fillStyle = g.eaten ? "#FFF" : "#1E40AF";
      } else {
        ctx.fillStyle = g.color;
      }
      ctx.beginPath();
      ctx.arc(gx, gy - 2, 7, Math.PI, 0);
      ctx.lineTo(gx + 7, gy + 5);
      for (let i = 0; i < 3; i++) {
        ctx.quadraticCurveTo(gx + 7 - i * 5, gy + (i % 2 === 0 ? 8 : 3), gx + 7 - (i + 1) * 5, gy + 5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = scareTimerRef.current > 0 ? "#FFF" : "#FFF";
      ctx.fillRect(gx - 3, gy - 4, 2, 3);
      ctx.fillRect(gx + 2, gy - 4, 2, 3);
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 14);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${livesRef.current}`, W - 10, 14);
  }, []);

  const gameLoop = useCallback(() => {
    const pac = pacRef.current;
    const keys = keysRef.current;

    if (keys.has("ArrowLeft") || keys.has("a")) moveQueueRef.current = { dx: -1, dy: 0 };
    if (keys.has("ArrowRight") || keys.has("d")) moveQueueRef.current = { dx: 1, dy: 0 };
    if (keys.has("ArrowUp") || keys.has("w")) moveQueueRef.current = { dx: 0, dy: -1 };
    if (keys.has("ArrowDown") || keys.has("s")) moveQueueRef.current = { dx: 0, dy: 1 };

    let nx = pac.x + moveQueueRef.current.dx;
    let ny = pac.y + moveQueueRef.current.dy;
    if (canMove(nx, ny) || nx < 0 || nx >= COLS) {
      pac.dx = moveQueueRef.current.dx;
      pac.dy = moveQueueRef.current.dy;
    }

    if (pac.dx !== 0 || pac.dy !== 0) {
      nx = pac.x + pac.dx;
      ny = pac.y + pac.dy;
      if (canMove(nx, ny)) {
        pac.x = nx;
        pac.y = ny;
      } else {
        pac.dx = 0;
        pac.dy = 0;
      }
    }

    if (pac.x < 0) pac.x = COLS - 1;
    if (pac.x >= COLS) pac.x = 0;

    pac.mouthAngle += 0.15 * pac.mouthDir;
    if (pac.mouthAngle > 0.4) pac.mouthDir = -1;
    if (pac.mouthAngle < 0.05) pac.mouthDir = 1;

    dotsRef.current = dotsRef.current.filter(([dx, dy]) => {
      if (dx === pac.x && dy === pac.y) {
        scoreRef.current += MAP[dy][dx] === 2 ? 50 : 10;
        setScore(scoreRef.current);
        if (MAP[dy][dx] === 2) scareTimerRef.current = 300;
        return false;
      }
      return true;
    });

    if (scareTimerRef.current > 0) scareTimerRef.current--;

    ghostsRef.current.forEach((g) => {
      const speed = g.eaten ? 2 : (scareTimerRef.current > 0 ? 0.3 : 0.8);
      if (Math.random() < speed) {
        const options: { dx: number; dy: number }[] = [];
        if (g.dy !== 1 && canMove(g.x + 1, g.y - 1)) options.push({ dx: 1, dy: 0 });
        if (g.dy !== -1 && canMove(g.x - 1, g.y + 1)) options.push({ dx: -1, dy: 0 });
        if (g.dx !== -1 && canMove(g.x - 1, g.y)) options.push({ dx: -1, dy: 0 });
        if (g.dx !== 1 && canMove(g.x + 1, g.y)) options.push({ dx: 1, dy: 0 });
        if (g.dx !== 0 && canMove(g.x, g.y + 1)) options.push({ dx: 0, dy: 1 });
        if (g.dx !== 0 && canMove(g.x, g.y - 1)) options.push({ dx: 0, dy: -1 });
        if (options.length > 0) {
          const pick = options[Math.floor(Math.random() * options.length)];
          g.dx = pick.dx;
          g.dy = pick.dy;
        }
      }
      const gx = g.x + g.dx * (speed >= 1 ? 1 : 0.5);
      const gy = g.y + g.dy * (speed >= 1 ? 1 : 0.5);
      if (canMove(Math.round(gx), Math.round(gy))) {
        g.x = Math.round(gx);
        g.y = Math.round(gy);
      } else {
        g.dx = -g.dx;
        g.dy = -g.dy;
      }

      if (g.x === pac.x && g.y === pac.y && !g.eaten) {
        if (scareTimerRef.current > 0) {
          g.eaten = true;
          scoreRef.current += 200;
          setScore(scoreRef.current);
        } else {
          livesRef.current--;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setGameState("gameover");
            if (scoreRef.current > highScore) setHighScore(scoreRef.current);
          }
          pac.x = 14;
          pac.y = 23;
          pac.dx = 0;
          pac.dy = 0;
        }
      }
    });

    if (dotsRef.current.length === 0) {
      initDots();
      initGhosts();
    }

    draw();
  }, [draw, canMove, highScore, initDots, initGhosts]);

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
    pacRef.current = { x: 14, y: 23, dx: 0, dy: 0, mouthAngle: 0, mouthDir: 1 };
    moveQueueRef.current = { dx: 0, dy: 0 };
    scoreRef.current = 0;
    livesRef.current = 3;
    scareTimerRef.current = 0;
    setScore(0);
    setLives(3);
    initDots();
    initGhosts();
    setGameState("playing");
  }, [initDots, initGhosts]);

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
      <h1 className="text-2xl font-bold text-white">Pac-Man</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-yellow-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move. Eat all dots!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowUp")} onTouchEnd={() => keysRef.current.delete("ArrowUp")} className="h-12 bg-gray-700 rounded text-white">UP</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowLeft")} onTouchEnd={() => keysRef.current.delete("ArrowLeft")} className="h-12 bg-gray-700 rounded text-white">{"<-"}</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowRight")} onTouchEnd={() => keysRef.current.delete("ArrowRight")} className="h-12 bg-gray-700 rounded text-white">{"->"}</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowDown")} onTouchEnd={() => keysRef.current.delete("ArrowDown")} className="h-12 bg-gray-700 rounded text-white">DOWN</button>
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
