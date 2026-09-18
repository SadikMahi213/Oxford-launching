"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Tile = { id: number; color: string; revealed: boolean; matched: boolean };

const TILE_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6",
  "#EC4899", "#F43F5E", "#14B8A6", "#6366F1",
];

export default function MemoryTiles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const getGridSize = (lvl: number) => {
    if (lvl <= 3) return { cols: 4, rows: 3 };
    if (lvl <= 6) return { cols: 4, rows: 4 };
    if (lvl <= 9) return { cols: 5, rows: 4 };
    return { cols: 6, rows: 5 };
  };

  const generateTiles = useCallback((lvl: number) => {
    const { cols, rows } = getGridSize(lvl);
    const total = cols * rows;
    const pairsNeeded = total / 2;
    const colors = [...TILE_COLORS].sort(() => Math.random() - 0.5).slice(0, pairsNeeded);
    const tilePairs = colors.flatMap((color, i) => [
      { id: i * 2, color, revealed: false, matched: false },
      { id: i * 2 + 1, color, revealed: false, matched: false },
    ]);
    for (let i = tilePairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tilePairs[i], tilePairs[j]] = [tilePairs[j], tilePairs[i]];
    }
    return tilePairs;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { cols, rows } = getGridSize(level);
    const padding = 8;
    const gap = 6;
    const tileW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const tileH = (canvas.height - padding * 2 - gap * (rows - 1) - 40) / rows;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Time: ${timeLeft}s | Moves: ${moves}`, canvas.width / 2, 25);

    tiles.forEach((tile, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (tileW + gap);
      const y = 40 + padding + row * (tileH + gap);

      if (tile.matched) {
        ctx.fillStyle = tile.color + "40";
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 8);
        ctx.fill();
        ctx.strokeStyle = tile.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = tile.color;
        ctx.font = `${Math.min(tileW, tileH) * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✓", x + tileW / 2, y + tileH / 2);
      } else if (tile.revealed) {
        ctx.fillStyle = tile.color;
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 8);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const grad = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
        grad.addColorStop(0, "#334155");
        grad.addColorStop(1, "#1E293B");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 8);
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#94A3B8";
        ctx.font = `${Math.min(tileW, tileH) * 0.3}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", x + tileW / 2, y + tileH / 2);
      }
    });
  }, [tiles, moves, timeLeft, level]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const { cols, rows } = getGridSize(level);
    const padding = 8;
    const gap = 6;
    const tileW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const tileH = (canvas.height - padding * 2 - gap * (rows - 1) - 40) / rows;

    for (let i = 0; i < tiles.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (tileW + gap);
      const y = 40 + padding + row * (tileH + gap);

      if (clickX >= x && clickX <= x + tileW && clickY >= y && clickY <= y + tileH) {
        if (!tiles[i].revealed && !tiles[i].matched && flippedIds.length < 2) {
          handleTileClick(i);
        }
        break;
      }
    }
  }, [gameState, tiles, flippedIds, level]);

  const handleTileClick = useCallback((index: number) => {
    if (gameState !== "playing") return;
    if (flippedIds.length >= 2) return;
    if (tiles[index].revealed || tiles[index].matched) return;

    const newTiles = tiles.map((t, i) => i === index ? { ...t, revealed: true } : t);
    setTiles(newTiles);
    const newFlipped = [...flippedIds, index];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newTiles[a].color === newTiles[b].color) {
        setTimeout(() => {
          setTiles(prev => prev.map((t, i) =>
            i === a || i === b ? { ...t, matched: true } : t
          ));
          setFlippedIds([]);
          setScore(s => s + 100);
        }, 400);
      } else {
        setTimeout(() => {
          setTiles(prev => prev.map((t, i) =>
            i === a || i === b ? { ...t, revealed: false } : t
          ));
          setFlippedIds([]);
        }, 800);
      }
    }
  }, [gameState, tiles, flippedIds]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const matched = tiles.filter(t => t.matched).length;
    if (matched === tiles.length && tiles.length > 0) {
      const bonus = timeLeft * 10;
      setScore(s => s + bonus);
      setLevel(l => l + 1);
      setTimeLeft(60 + level * 5);
      const newTiles = generateTiles(level + 1);
      setTiles(newTiles);
      setFlippedIds([]);
      setMoves(0);
    }
  }, [tiles, gameState, timeLeft, level, generateTiles]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState("gameover");
          setScore(s => {
            if (s > highScore) setHighScore(s);
            return s;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, highScore]);

  const startGame = useCallback(() => {
    const newTiles = generateTiles(1);
    setTiles(newTiles);
    setFlippedIds([]);
    setMoves(0);
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setGameState("playing");
  }, [generateTiles]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        if (gameState === "idle" || gameState === "gameover") {
          e.preventDefault();
          startGame();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Memory Tiles</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">Time: <span className="text-yellow-400 font-bold">{timeLeft}s</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={400}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Click tiles to find matching pairs!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Time's Up!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
