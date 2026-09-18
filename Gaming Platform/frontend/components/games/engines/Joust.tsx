"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const W = 480;
const H = 400;
const KNIGHT_SIZE = 16;
const GRAVITY = 0.4;

interface Knight { x: number; y: number; dy: number; facing: number; groundY: number; alive: boolean; }

export default function Joust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const playerRef = useRef({ x: W / 2, y: H - 80, dy: 0, facing: 1, grounded: true });
  const enemiesRef = useRef<Knight[]>([]);
  const platformsRef = useRef<{ x: number; y: number; w: number }[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const initLevel = useCallback(() => {
    platformsRef.current = [
      { x: 0, y: H - 40, w: W },
      { x: 50, y: H - 120, w: 120 },
      { x: 200, y: H - 120, w: 120 },
      { x: 350, y: H - 120, w: 120 },
      { x: 120, y: H - 200, w: 120 },
      { x: 300, y: H - 200, w: 120 },
      { x: 180, y: H - 280, w: 120 },
    ];
    enemiesRef.current = [];
    for (let i = 0; i < 3; i++) {
      enemiesRef.current.push({
        x: 50 + Math.random() * (W - 100),
        y: H - 160 - Math.random() * 100,
        dy: 0, facing: Math.random() < 0.5 ? 1 : -1, groundY: H - 120, alive: true,
      });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    platformsRef.current.forEach((p) => {
      ctx.fillStyle = "#4A5568";
      ctx.fillRect(p.x, p.y, p.w, 8);
      ctx.fillStyle = "#718096";
      ctx.fillRect(p.x, p.y, p.w, 3);
    });

    const p = playerRef.current;
    const flash = livesRef.current <= 1 && Math.floor(Date.now() / 200) % 2 === 0;
    if (!flash) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(-KNIGHT_SIZE / 2, -KNIGHT_SIZE, KNIGHT_SIZE, KNIGHT_SIZE);
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(KNIGHT_SIZE / 2 - 2, -KNIGHT_SIZE + 4, 12, 3);
      ctx.fillRect(KNIGHT_SIZE / 2 + 8, -KNIGHT_SIZE + 1, 3, 8);
      ctx.restore();
    }

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(e.facing, 1);
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(-KNIGHT_SIZE / 2, -KNIGHT_SIZE, KNIGHT_SIZE, KNIGHT_SIZE);
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(KNIGHT_SIZE / 2 - 2, -KNIGHT_SIZE + 4, 12, 3);
      ctx.restore();
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

    if (keys.has("ArrowLeft") || keys.has("a")) {
      player.x -= 3;
      player.facing = -1;
    }
    if (keys.has("ArrowRight") || keys.has("d")) {
      player.x += 3;
      player.facing = 1;
    }
    if ((keys.has("ArrowUp") || keys.has("w") || keys.has(" ")) && player.grounded) {
      player.dy = -8;
      player.grounded = false;
    }

    player.dy += GRAVITY;
    player.y += player.dy;
    player.grounded = false;

    platformsRef.current.forEach((plat) => {
      if (player.y >= plat.y && player.y <= plat.y + 10 && player.x >= plat.x && player.x <= plat.x + plat.w && player.dy >= 0) {
        player.y = plat.y;
        player.dy = 0;
        player.grounded = true;
      }
    });

    if (player.y > H) {
      livesRef.current--;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        setGameState("gameover");
        if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      }
      player.x = W / 2;
      player.y = H - 80;
      player.dy = 0;
    }
    player.x = Math.max(KNIGHT_SIZE, Math.min(W - KNIGHT_SIZE, player.x));

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      e.x += e.facing * 1.5;
      if (e.x < 20 || e.x > W - 20) e.facing *= -1;

      e.dy += GRAVITY;
      e.y += e.dy;
      platformsRef.current.forEach((plat) => {
        if (e.y >= plat.y && e.y <= plat.y + 10 && e.x >= plat.x && e.x <= plat.x + plat.w && e.dy >= 0) {
          e.y = plat.y;
          e.dy = 0;
        }
      });
    });

    enemiesRef.current.forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(player.x - e.x) < KNIGHT_SIZE * 1.5 && Math.abs(player.y - e.y) < KNIGHT_SIZE) {
        if (player.y < e.y && player.dy > 0) {
          e.alive = false;
          scoreRef.current += 100;
          setScore(scoreRef.current);
          player.dy = -6;
        } else if (player.y > e.y && e.dy < 0) {
          livesRef.current--;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setGameState("gameover");
            if (scoreRef.current > highScore) setHighScore(scoreRef.current);
          }
        }
      }
    });

    if (enemiesRef.current.every((e) => !e.alive)) {
      for (let i = 0; i < 3; i++) {
        enemiesRef.current.push({
          x: 50 + Math.random() * (W - 100),
          y: 50 + Math.random() * 100,
          dy: 0, facing: Math.random() < 0.5 ? 1 : -1, groundY: H - 120, alive: true,
        });
      }
      scoreRef.current += 50;
      setScore(scoreRef.current);
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
    playerRef.current = { x: W / 2, y: H - 80, dy: 0, facing: 1, grounded: true };
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    initLevel();
    setGameState("playing");
  }, [initLevel]);

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
      <h1 className="text-2xl font-bold text-white">Joust</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Arrow keys / WASD to move, Space to flap. Lunge from above to defeat enemies!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      )}
      <div className="grid grid-cols-3 gap-2 md:hidden w-48">
        <div />
        <button onTouchStart={() => { playerRef.current.dy = -8; playerRef.current.grounded = false; }} className="h-12 bg-blue-600 rounded text-white font-bold">FLAP</button>
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
