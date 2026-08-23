"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

interface Card { suit: string; rank: string; faceUp: boolean; }

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r, faceUp: false });
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rankValue(rank: string): number {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return parseInt(rank);
}

interface Column { cards: Card[]; }

export default function Solitaire() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);

  const tableauRef = useRef<Column[]>([]);
  const stockRef = useRef<Card[]>([]);
  const wasteRef = useRef<Card[]>([]);
  const foundationsRef = useRef<Card[][]>([[], [], [], []]);
  const scoreRef = useRef(0);
  const animRef = useRef<number>(0);

  const initGame = useCallback(() => {
    const deck = createDeck();
    const tableau: Column[] = [];
    let idx = 0;
    for (let i = 0; i < 7; i++) {
      const cards: Card[] = [];
      for (let j = 0; j <= i; j++) {
        cards.push({ ...deck[idx], faceUp: j === i });
        idx++;
      }
      tableau.push({ cards });
    }
    tableauRef.current = tableau;
    stockRef.current = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
    wasteRef.current = [];
    foundationsRef.current = [[], [], [], []];
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#065F46";
    ctx.fillRect(0, 0, 480, 400);

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 18);

    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 30, 50, 65);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    if (stockRef.current.length > 0) {
      ctx.fillText("🂠", 35, 70);
    } else {
      ctx.font = "10px sans-serif";
      ctx.fillText("empty", 35, 65);
    }

    if (wasteRef.current.length > 0) {
      const c = wasteRef.current[wasteRef.current.length - 1];
      ctx.strokeStyle = "#FFF";
      ctx.strokeRect(70, 30, 50, 65);
      ctx.fillStyle = c.suit === "♥" || c.suit === "♦" ? "#DC2626" : "#FFF";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(c.rank, 95, 55);
      ctx.font = "16px sans-serif";
      ctx.fillText(c.suit, 95, 75);
    }

    for (let f = 0; f < 4; f++) {
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(340 + f * 60, 30, 50, 65);
      const pile = foundationsRef.current[f];
      if (pile.length > 0) {
        const c = pile[pile.length - 1];
        ctx.fillStyle = c.suit === "♥" || c.suit === "♦" ? "#DC2626" : "#FFF";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(c.rank, 365 + f * 60, 55);
        ctx.font = "16px sans-serif";
        ctx.fillText(c.suit, 365 + f * 60, 75);
      }
    }

    tableauRef.current.forEach((col, ci) => {
      const x = 10 + ci * 67;
      col.cards.forEach((card, j) => {
        const y = 110 + j * 22;
        if (card.faceUp) {
          ctx.fillStyle = "#FFF";
          ctx.fillRect(x, y, 55, 65);
          ctx.strokeStyle = "#333";
          ctx.strokeRect(x, y, 55, 65);
          ctx.fillStyle = card.suit === "♥" || card.suit === "♦" ? "#DC2626" : "#111";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`${card.rank}${card.suit}`, x + 4, y + 15);
        } else {
          ctx.fillStyle = "#2563EB";
          ctx.fillRect(x, y, 55, 65);
          ctx.strokeStyle = "#1D4ED8";
          ctx.strokeRect(x, y, 55, 65);
        }
      });
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Click stock to draw | Click card to move to foundation", 240, 395);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (480 / rect.width);
    const my = (e.clientY - rect.top) * (400 / rect.height);

    if (mx >= 10 && mx <= 60 && my >= 30 && my <= 95) {
      if (stockRef.current.length === 0) {
        stockRef.current = wasteRef.current.reverse().map((c) => ({ ...c, faceUp: false }));
        wasteRef.current = [];
      } else {
        const card = stockRef.current.pop()!;
        card.faceUp = true;
        wasteRef.current.push(card);
      }
      draw();
      return;
    }

    if (wasteRef.current.length > 0 && mx >= 70 && mx <= 120 && my >= 30 && my <= 95) {
      const card = wasteRef.current[wasteRef.current.length - 1];
      for (let f = 0; f < 4; f++) {
        const pile = foundationsRef.current[f];
        if (pile.length === 0 && card.rank === "A") {
          wasteRef.current.pop();
          pile.push(card);
          scoreRef.current += 10;
          setScore(scoreRef.current);
          draw();
          return;
        }
        if (pile.length > 0) {
          const top = pile[pile.length - 1];
          if (top.suit === card.suit && rankValue(card.rank) === rankValue(top.rank) + 1) {
            wasteRef.current.pop();
            pile.push(card);
            scoreRef.current += 10;
            setScore(scoreRef.current);
            draw();
            return;
          }
        }
      }
    }

    tableauRef.current.forEach((col) => {
      for (let j = col.cards.length - 1; j >= 0; j--) {
        const card = col.cards[j];
        const x = 10 + tableauRef.current.indexOf(col) * 67;
        const y = 110 + j * 22;
        if (card.faceUp && mx >= x && mx <= x + 55 && my >= y && my <= y + 65) {
          for (let f = 0; f < 4; f++) {
            const pile = foundationsRef.current[f];
            if (pile.length === 0 && card.rank === "A") {
              col.cards.splice(j, 1);
              if (col.cards.length > 0) col.cards[col.cards.length - 1].faceUp = true;
              pile.push(card);
              scoreRef.current += 10;
              setScore(scoreRef.current);
              draw();
              return;
            }
            if (pile.length > 0) {
              const top = pile[pile.length - 1];
              if (top.suit === card.suit && rankValue(card.rank) === rankValue(top.rank) + 1) {
                col.cards.splice(j, 1);
                if (col.cards.length > 0) col.cards[col.cards.length - 1].faceUp = true;
                pile.push(card);
                scoreRef.current += 10;
                setScore(scoreRef.current);
                draw();
                return;
              }
            }
          }
          break;
        }
      }
    });
  }, [gameState, draw]);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(function loop() {
        draw();
        animRef.current = requestAnimationFrame(loop);
      });
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, draw]);

  const startGame = useCallback(() => {
    initGame();
    setGameState("playing");
  }, [initGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Solitaire</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
      </div>
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Click stock to draw, click cards to move to foundations</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <canvas ref={canvasRef} width={480} height={400} onClick={handleClick} className="rounded-lg border border-gray-700 cursor-pointer" style={{ maxWidth: "100%" }} />
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-green-400">You Win!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
