"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";
type GameObject = { x: number; y: number; type: string; color: string };

const OBJECT_TYPES = [
  { type: "circle", color: "#EF4444" },
  { type: "square", color: "#3B82F6" },
  { type: "triangle", color: "#22C55E" },
  { type: "diamond", color: "#F59E0B" },
  { type: "star", color: "#A855F7" },
];

export default function VisualMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [clickedObjects, setClickedObjects] = useState<Set<number>>(new Set());
  const [selectedObjects, setSelectedObjects] = useState<Set<number>>(new Set());
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const generateObjects = useCallback((lvl: number) => {
    const count = Math.min(lvl + 2, 8);
    const objs: GameObject[] = [];
    for (let i = 0; i < count; i++) {
      const typeIdx = Math.floor(Math.random() * OBJECT_TYPES.length);
      objs.push({
        x: 40 + Math.random() * 400,
        y: 60 + Math.random() * 220,
        type: OBJECT_TYPES[typeIdx].type,
        color: OBJECT_TYPES[typeIdx].color,
      });
    }
    return objs;
  }, []);

  const drawObject = useCallback((ctx: CanvasRenderingContext2D, obj: GameObject, size: number, highlight: boolean) => {
    ctx.fillStyle = highlight ? obj.color : obj.color + "60";
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = highlight ? 3 : 1;

    switch (obj.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case "square":
        ctx.fillRect(obj.x - size, obj.y - size, size * 2, size * 2);
        ctx.strokeRect(obj.x - size, obj.y - size, size * 2, size * 2);
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y - size);
        ctx.lineTo(obj.x - size, obj.y + size);
        ctx.lineTo(obj.x + size, obj.y + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y - size);
        ctx.lineTo(obj.x + size, obj.y);
        ctx.lineTo(obj.x, obj.y + size);
        ctx.lineTo(obj.x - size, obj.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "star":
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = obj.x + Math.cos(angle) * size;
          const y = obj.y + Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Level ${level} | Score: ${score}`, canvas.width / 2, 25);

    const objSize = Math.max(15, 25 - level);

    if (gameState === "showing") {
      objects.forEach(obj => drawObject(ctx, obj, objSize, true));
      ctx.fillStyle = "#EAB308";
      ctx.font = "16px sans-serif";
      ctx.fillText("Memorize positions!", canvas.width / 2, canvas.height - 15);
    } else if (gameState === "input") {
      objects.forEach((obj, i) => {
        drawObject(ctx, obj, objSize, selectedObjects.has(i));
      });
      ctx.fillStyle = "#22C55E";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Click the objects! (${selectedObjects.size}/${objects.length})`, canvas.width / 2, canvas.height - 15);
    } else {
      objects.forEach((obj, i) => {
        drawObject(ctx, obj, objSize, clickedObjects.has(i));
      });
    }
  }, [gameState, score, level, objects, selectedObjects, clickedObjects, drawObject]);

  useEffect(() => {
    draw();
  }, [draw]);

  const showObjects = useCallback((objs: GameObject[]) => {
    clearTimeouts();
    setGameState("showing");
    setSelectedObjects(new Set());

    const t = setTimeout(() => {
      setGameState("input");
      setSelectedObjects(new Set());
    }, 2000 + objs.length * 200);
    timeoutsRef.current.push(t);
  }, [clearTimeouts]);

  const startGame = useCallback(() => {
    clearTimeouts();
    setScore(0);
    setLevel(1);
    const objs = generateObjects(1);
    setObjects(objs);
    setClickedObjects(new Set());
    setGameState("playing");
    showObjects(objs);
  }, [generateObjects, showObjects, clearTimeouts]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "input") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const objSize = Math.max(15, 25 - level);

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const dist = Math.sqrt((clickX - obj.x) ** 2 + (clickY - obj.y) ** 2);
      if (dist <= objSize + 5 && !selectedObjects.has(i)) {
        const newSelected = new Set(selectedObjects);
        newSelected.add(i);
        setSelectedObjects(newSelected);

        if (newSelected.size === objects.length) {
          const allCorrect = objects.every((_, idx) => newSelected.has(idx));
          if (allCorrect) {
            const pts = objects.length * 150;
            setScore(s => s + pts);
            const newLevel = level + 1;
            setLevel(newLevel);
            const newObjs = generateObjects(newLevel);
            setObjects(newObjs);
            setTimeout(() => showObjects(newObjs), 1000);
          } else {
            if (score > highScore) setHighScore(score);
            setTimeout(() => setGameState("gameover"), 500);
          }
        }
        break;
      }
    }
  }, [gameState, objects, selectedObjects, level, score, highScore, generateObjects, showObjects]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

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
      <h1 className="text-2xl font-bold text-white">Visual Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={340}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Remember the object positions, then click them!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Wrong Positions!</p>
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
