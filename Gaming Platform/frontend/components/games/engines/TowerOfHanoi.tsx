"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "won" | "gameover";

const PEG_COUNT = 4;
const MAX_DISC_SIZE = 8;

const generatePuzzle = (level: number) => {
  const discs = Math.min(level + 2, MAX_DISC_SIZE);
  const pegs: number[][] = [Array.from({ length: discs }, (_, i) => discs - i), [], []];
  return { pegs, discs, moves: 0 };
};

const isWon = (pegs: number[][], discs: number) => pegs[2].length === discs;

const canMove = (pegs: number[][], from: number, to: number) => {
  if (from < 0 || from > 2 || to < 0 || to > 2) return false;
  if (pegs[from].length === 0) return false;
  if (pegs[to].length === 0) return true;
  return pegs[from][0] < pegs[to][0];
};

const DISC_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

export default function TowerOfHanoi() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [pegs, setPegs] = useState<number[][]>([[], [], []]);
  const [discs, setDiscs] = useState(3);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [bestMoves, setBestMoves] = useState<number[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pegWidth = 12;
    const baseY = canvas.height - 40;
    const pegHeight = 200;
    const discHeight = 22;
    const maxDiscWidth = 120;

    ctx.fillStyle = "#374151";
    ctx.fillRect(20, baseY, canvas.width - 40, 12);

    for (let p = 0; p < 3; p++) {
      const px = 80 + p * 140;
      ctx.fillStyle = "#6B7280";
      ctx.fillRect(px - pegWidth / 2, baseY - pegHeight, pegWidth, pegHeight);

      if (selectedPeg === p) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 3;
        ctx.strokeRect(px - maxDiscWidth / 2 - 5, baseY - pegHeight - 10, maxDiscWidth + 10, pegHeight + 25);
      }

      pegs[p].forEach((disc, i) => {
        const y = baseY - (i + 1) * discHeight;
        const w = (disc / discs) * maxDiscWidth;
        const x = px - w / 2;

        ctx.fillStyle = DISC_COLORS[(disc - 1) % DISC_COLORS.length];
        ctx.beginPath();
        ctx.roundRect(x, y, w, discHeight - 3, 4);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(disc), px, y + discHeight / 2 - 1);
      });

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String.fromCharCode(65 + p), px, baseY + 30);
    }
  }, [pegs, discs, selectedPeg]);

  const startGame = useCallback(() => {
    const { pegs: p, discs: d } = generatePuzzle(level);
    setPegs(p);
    setDiscs(d);
    setSelectedPeg(null);
    setMoves(0);
    setGameState("playing");
  }, [level]);

  const handlePegClick = useCallback((pegIdx: number) => {
    if (gameState !== "playing") return;

    if (selectedPeg === null) {
      if (pegs[pegIdx].length > 0) setSelectedPeg(pegIdx);
    } else {
      if (selectedPeg === pegIdx) {
        setSelectedPeg(null);
        return;
      }
      if (canMove(pegs, selectedPeg, pegIdx)) {
        const newPegs = pegs.map((p) => [...p]);
        const disc = newPegs[selectedPeg].shift()!;
        newPegs[pegIdx].unshift(disc);
        setPegs(newPegs);
        setMoves((m) => m + 1);
      }
      setSelectedPeg(null);
    }
  }, [gameState, selectedPeg, pegs]);

  useEffect(() => {
    if (pegs.length > 0 && isWon(pegs, discs) && gameState === "playing") {
      const optimal = Math.pow(2, discs) - 1;
      const scoreVal = Math.max(100, 500 - (moves - optimal) * 10 + level * 50);
      setScore(scoreVal);
      setBestMoves((prev) => {
        const newBest = [...prev];
        if (!newBest[level - 1] || moves < newBest[level - 1]) newBest[level - 1] = moves;
        return newBest;
      });
      setGameState("won");
    }
  }, [pegs, discs, gameState, moves, level]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const pegIdx = mx < 140 ? 0 : mx < 280 ? 1 : 2;
    handlePegClick(pegIdx);
  }, [gameState, handlePegClick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.key === "1") handlePegClick(0);
      if (e.key === "2") handlePegClick(1);
      if (e.key === "3") handlePegClick(2);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handlePegClick]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Tower of Hanoi</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Moves: {moves}</span>
        <span className="text-blue-400">Level: {level}</span>
        <span className="text-green-400">Optimal: {Math.pow(2, discs) - 1}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={420}
        height={280}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
      />

      {gameState === "playing" && (
        <p className="text-gray-400 text-sm">Click a peg or press 1/2/3 to select, then click destination.</p>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Move all discs from peg A to peg C. A larger disc cannot sit on a smaller one.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Level {level}</button>
        </div>
      )}

      {gameState === "won" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Solved! 🎉</p>
          <p className="text-white">Moves: {moves} | Optimal: {Math.pow(2, discs) - 1}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setLevel((l) => l + 1); setGameState("idle"); }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">Next Level</button>
            <button onClick={() => { setLevel(1); setGameState("idle"); }} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded">Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
