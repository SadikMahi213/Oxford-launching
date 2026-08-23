"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover";
type Category = "ones" | "twos" | "threes" | "fours" | "fives" | "sixes" | "threeKind" | "fourKind" | "fullHouse" | "smStraight" | "lgStraight" | "yahtzee" | "chance";

interface Dice { value: number; held: boolean; }

function createDice(): Dice[] {
  return Array.from({ length: 5 }, () => ({ value: Math.ceil(Math.random() * 6), held: false }));
}

function scoreCategory(dice: Dice[], cat: Category): number {
  const values = dice.map((d) => d.value);
  const counts = Array(7).fill(0);
  values.forEach((v) => counts[v]++);

  switch (cat) {
    case "ones": return counts[1] * 1;
    case "twos": return counts[2] * 2;
    case "threes": return counts[3] * 3;
    case "fours": return counts[4] * 4;
    case "fives": return counts[5] * 5;
    case "sixes": return counts[6] * 6;
    case "threeKind": return counts.some((c) => c >= 3) ? values.reduce((a, b) => a + b, 0) : 0;
    case "fourKind": return counts.some((c) => c >= 4) ? values.reduce((a, b) => a + b, 0) : 0;
    case "fullHouse": {
      const has3 = counts.some((c) => c === 3);
      const has2 = counts.some((c) => c === 2);
      return has3 && has2 ? 25 : 0;
    }
    case "smStraight": {
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      for (let i = 0; i <= sorted.length - 4; i++) {
        if (sorted[i + 3] - sorted[i] === 3) return 30;
      }
      return 0;
    }
    case "lgStraight": {
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      if (sorted.length >= 5 && sorted[4] - sorted[0] === 4) return 40;
      return 0;
    }
    case "yahtzee": return counts.some((c) => c === 5) ? 50 : 0;
    case "chance": return values.reduce((a, b) => a + b, 0);
    default: return 0;
  }
}

function renderDie(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, value: number, held: boolean) {
  ctx.fillStyle = held ? "#FBBF24" : "#FFF";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = held ? "#F59E0B" : "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);

  const cx = x + size / 2;
  const cy = y + size / 2;
  const dotR = size * 0.08;
  ctx.fillStyle = "#111";

  const dots: [number, number][] = [];
  if (value === 1 || value === 3 || value === 5) dots.push([cx, cy]);
  if (value >= 2) { dots.push([x + size * 0.25, y + size * 0.25]); dots.push([x + size * 0.75, y + size * 0.75]); }
  if (value >= 4) { dots.push([x + size * 0.75, y + size * 0.25]); dots.push([x + size * 0.25, y + size * 0.75]); }
  if (value === 6) { dots.push([x + size * 0.25, cy]); dots.push([x + size * 0.75, cy]); }

  dots.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fill();
  });
}

export default function Yahtzee() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [dice, setDice] = useState<Dice[]>(createDice());
  const [rollsLeft, setRollsLeft] = useState(3);
  const [totalScore, setTotalScore] = useState(0);
  const [categories, setCategories] = useState<Record<Category, number | null>>({
    ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
    threeKind: null, fourKind: null, fullHouse: null, smStraight: null, lgStraight: null, yahtzee: null, chance: null,
  });
  const [message, setMessage] = useState("");
  const [rolling, setRolling] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 400, 350);

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Rolls Left: ${rollsLeft}`, 200, 20);

    dice.forEach((d, i) => {
      renderDie(ctx, 40 + i * 65, 40, 55, d.value, d.held);
    });

    const cats = Object.entries(categories) as [Category, number | null][];
    const cols = 2;
    const colW = 190;
    const startY = 115;

    cats.forEach(([cat, val], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 10 + col * colW;
      const y = startY + row * 22;
      ctx.fillStyle = val !== null ? "#22C55E" : "#9CA3AF";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${cat}: ${val !== null ? val : "-"}`, x, y);
    });

    if (message) {
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#FBBF24";
      ctx.textAlign = "center";
      ctx.fillText(message, 200, 340);
    }
  }, [dice, rollsLeft, categories, message]);

  useEffect(() => { draw(); }, [draw]);

  const rollDice = useCallback(() => {
    if (rollsLeft <= 0 || rolling) return;
    setRolling(true);
    setDice((prev) => prev.map((d) => d.held ? d : { ...d, value: Math.ceil(Math.random() * 6) }));
    setRollsLeft((r) => r - 1);
    setTimeout(() => setRolling(false), 500);
  }, [rollsLeft, rolling]);

  const toggleHold = useCallback((idx: number) => {
    if (rollsLeft === 3) return;
    setDice((prev) => prev.map((d, i) => i === idx ? { ...d, held: !d.held } : d));
  }, [rollsLeft]);

  const scoreCat = useCallback((cat: Category) => {
    if (categories[cat] !== null || rollsLeft === 3) return;
    const s = scoreCategory(dice, cat);
    setCategories((prev) => ({ ...prev, [cat]: s }));
    setTotalScore((t) => t + s);
    setDice(createDice());
    setRollsLeft(3);
    setMessage(`Scored ${s} for ${cat}`);

    setTimeout(() => setMessage(""), 1500);

    const allFilled = Object.values({ ...categories, [cat]: s }).every((v) => v !== null);
    if (allFilled) {
      setGameState("gameover");
    }
  }, [categories, dice, rollsLeft]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || rolling) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (400 / rect.width);
    const my = (e.clientY - rect.top) * (350 / rect.height);

    if (my >= 40 && my <= 95) {
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 65;
        if (mx >= x && mx <= x + 55) {
          toggleHold(i);
          break;
        }
      }
    }
  }, [gameState, rolling, toggleHold]);

  const startGame = useCallback(() => {
    setDice(createDice());
    setRollsLeft(3);
    setTotalScore(0);
    setCategories({
      ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
      threeKind: null, fourKind: null, fullHouse: null, smStraight: null, lgStraight: null, yahtzee: null, chance: null,
    });
    setMessage("");
    setGameState("playing");
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Yahtzee</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{totalScore}</span></span>
        <span className="text-gray-400">Rolls: <span className="text-blue-400 font-bold">{rollsLeft}</span></span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Roll dice up to 3 times. Score in categories to earn points!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <canvas ref={canvasRef} width={400} height={350} onClick={handleClick} className="rounded-lg border border-gray-700 cursor-pointer" style={{ maxWidth: "100%" }} />
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {(Object.keys(categories) as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => scoreCat(cat)}
                disabled={categories[cat] !== null || rollsLeft === 3}
                className={`px-2 py-1 rounded text-xs font-bold ${
                  categories[cat] !== null ? "bg-green-800 text-green-200" :
                  rollsLeft === 3 ? "bg-gray-700 text-gray-500" :
                  "bg-blue-600 text-white hover:bg-blue-500"
                } transition`}
              >
                {cat}: {categories[cat] !== null ? categories[cat] : "-"}
              </button>
            ))}
          </div>
          <button onClick={rollDice} disabled={rollsLeft <= 0 || rolling} className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-500 transition disabled:opacity-50">
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{totalScore}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
