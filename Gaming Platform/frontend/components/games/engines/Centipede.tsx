"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 480;
const TILE = 16;
const COLS = 30;
const ROWS = 30;
const PLAYER_SIZE = 12;
const BULLET_SPEED = 6;

interface Bullet { x: number; y: number; }
interface Segment { x: number; y: number; }

export default function Centipede() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const playerRef = useRef({ x: W / 2, y: H - 40 });
  const bulletsRef = useRef<Bullet[]>([]);
  const centipedeRef = useRef<Segment[]>([]);
  const centDirRef = useRef({ dx: 1, dy: 0 });
  const mushroomsRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const tickRef = useRef(0);

  const initMushrooms = useCallback((count: number) => {
    const mushrooms = new Set<string>();
    for (let i = 0; i < count; i++) {
      mushrooms.add(`${Math.floor(Math.random() * COLS)},${Math.floor(Math.random() * (ROWS - 3)) + 1}`);
    }
    mushroomsRef.current = mushrooms;
  }, []);

  const initCentipede = useCallback(() => {
    const segs: Segment[] = [];
    for (let i = 0; i < 10; i++) {
      segs.push({ x: 10 + i, y: 0 });
    }
    centipedeRef.current = segs;
    centDirRef.current = { dx: 1, dy: 1 };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);

    mushroomsRef.current.forEach((key) => {
      const [mx, my] = key.split(",").map(Number);
      ctx.fillStyle = "#A855F7";
      ctx.fillRect(mx * TILE + 2, my * TILE + 4, TILE - 4, TILE - 6);
      ctx.fillStyle = "#C084FC";
      ctx.fillRect(mx * TILE + 4, my * TILE + 2, TILE - 8, 4);
    });

    centipedeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#EF4444" : "#22C55E";
      ctx.beginPath();
      ctx.arc(seg.x * TILE + TILE / 2, seg.y * TILE + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(seg.x * TILE + 3, seg.y * TILE + 4, 3, 3);
        ctx.fillRect(seg.x * TILE + TILE - 6, seg.y * TILE + 4, 3, 3);
      }
    });

    const p = playerRef.current;
    ctx.fillStyle = "#38BDF8";
    ctx.fillRect(p.x - PLAYER_SIZE / 2, p.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(p.x - 1, p.y - 6, 2, 4);

    bulletsRef.current.forEach((b) => {
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(b.x - 1, b.y, 2, 8);
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
    const step = 4;

    if (keys.has("ArrowLeft") || keys.has("a")) player.x = Math.max(PLAYER_SIZE / 2, player.x - step);
    if (keys.has("ArrowRight") || keys.has("d")) player.x = Math.min(W - PLAYER_SIZE / 2, player.x + step);
    if (keys.has("ArrowUp") || keys.has("w")) player.y = Math.max(H / 2, player.y - step);
    if (keys.has("ArrowDown") || keys.has("s")) player.y = Math.min(H - PLAYER_SIZE / 2, player.y + step);

    bulletsRef.current.forEach((b) => { b.y -= BULLET_SPEED; });
    bulletsRef.current = bulletsRef.current.filter((b) => b.y > -10);

    tickRef.current++;
    if (tickRef.current % 8 === 0) {
      const cent = centipedeRef.current;
      const dir = centDirRef.current;
      const head = cent[0];
      let nx = head.x + dir.dx;
      let ny = head.y + dir.dy;
      const key = `${nx},${ny}`;

      if (nx < 0 || nx >= COLS || mushroomsRef.current.has(key)) {
        dir.dx *= -1;
        dir.dy = dir.dy === 0 ? 1 : 0;
        nx = head.x + dir.dx;
        ny = head.y + dir.dy;
      }

      if (ny >= ROWS) {
        ny = 0;
        nx = Math.floor(Math.random() * COLS);
      }

      const newHead = { x: nx, y: ny };
      cent.unshift(newHead);
      cent.pop();
    }

    const cent = centipedeRef.current;
    bulletsRef.current.forEach((b, bi) => {
      cent.forEach((seg, si) => {
        if (Math.abs(b.x - (seg.x * TILE + TILE / 2)) < TILE && Math.abs(b.y - (seg.y * TILE + TILE / 2)) < TILE) {
          mushroomsRef.current.add(`${seg.x},${seg.y}`);
          cent.splice(si, 1);
          bulletsRef.current.splice(bi, 1);
          scoreRef.current += 10;
          setScore(scoreRef.current);
          if (cent.length === 0) {
            initCentipede();
            initMushrooms(mushroomsRef.current.size + 10);
          }
        }
      });
    });

    cent.forEach((seg) => {
      if (Math.abs(seg.x * TILE + TILE / 2 - player.x) < PLAYER_SIZE && Math.abs(seg.y * TILE + TILE / 2 - player.y) < PLAYER_SIZE) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameState("gameover");
          if (scoreRef.current > highScore) setHighScore(scoreRef.current);
        }
        player.x = W / 2;
        player.y = H - 40;
      }
    });

    draw();
  }, [draw, highScore, initCentipede, initMushrooms]);

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
    playerRef.current = { x: W / 2, y: H - 40 };
    bulletsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    tickRef.current = 0;
    setScore(0);
    setLives(3);
    initMushrooms(30);
    initCentipede();
    setGameState("playing");
  }, [initMushrooms, initCentipede]);

  const shoot = useCallback(() => {
    if (gameState !== "playing") return;
    const p = playerRef.current;
    bulletsRef.current.push({ x: p.x, y: p.y - PLAYER_SIZE / 2 });
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
      <h1 className="text-2xl font-bold text-white">Centipede</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
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
        <button onTouchStart={() => keysRef.current.add("ArrowUp")} onTouchEnd={() => keysRef.current.delete("ArrowUp")} className="h-12 bg-gray-700 rounded text-white">UP</button>
        <div />
        <button onTouchStart={() => keysRef.current.add("ArrowLeft")} onTouchEnd={() => keysRef.current.delete("ArrowLeft")} className="h-12 bg-gray-700 rounded text-white">{"<-"}</button>
        <button onClick={shoot} className="h-12 bg-yellow-600 rounded text-white font-bold">FIRE</button>
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
