"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

interface Card { suit: string; rank: string; flipped: boolean; matched: boolean; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CardFlip() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const cardsRef = useRef<Card[]>([]);
  const flippedRef = useRef<number[]>([]);
  const matchedCountRef = useRef(0);
  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const animRef = useRef<number>(0);
  const lockRef = useRef(false);

  const initCards = useCallback((pairs: number) => {
    const deck: Card[] = [];
    const available = shuffle(
      SUITS.flatMap((s) => RANKS.map((r) => ({ suit: s, rank: r })))
    );
    for (let i = 0; i < pairs; i++) {
      const c = available[i];
      deck.push({ suit: c.suit, rank: c.rank, flipped: false, matched: false });
      deck.push({ suit: c.suit, rank: c.rank, flipped: false, matched: false });
    }
    cardsRef.current = shuffle(deck);
    flippedRef.current = [];
    matchedCountRef.current = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.ceil(Math.sqrt(cardsRef.current.length));
    const rows = Math.ceil(cardsRef.current.length / cols);
    const cardW = Math.min(60, (480 - 20) / cols);
    const cardH = cardW * 1.4;
    const startX = (480 - cols * cardW) / 2;

    ctx.fillStyle = "#1E3A5F";
    ctx.fillRect(0, 0, 480, rows * (cardH + 8) + 40);

    cardsRef.current.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + 4);
      const y = 20 + row * (cardH + 8);

      if (card.matched) {
        ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.fillStyle = "#22C55E";
        ctx.font = `${cardW * 0.35}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("✓", x + cardW / 2, y + cardH / 2 + cardW * 0.12);
      } else if (card.flipped) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.fillStyle = card.suit === "♥" || card.suit === "♦" ? "#DC2626" : "#111";
        ctx.font = `bold ${cardW * 0.35}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(card.rank, x + cardW / 2, y + cardH * 0.45);
        ctx.font = `${cardW * 0.4}px sans-serif`;
        ctx.fillText(card.suit, x + cardW / 2, y + cardH * 0.75);
      } else {
        ctx.fillStyle = "#2563EB";
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeStyle = "#1D4ED8";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.fillStyle = "#60A5FA";
        ctx.font = `${cardW * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("?", x + cardW / 2, y + cardH / 2 + cardW * 0.14);
      }
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Pairs: ${matchedCountRef.current}/${cardsRef.current.length / 2}`, 10, rows * (cardH + 8) + 30);
    ctx.textAlign = "right";
    ctx.fillText(`Moves: ${movesRef.current}`, 470, rows * (cardH + 8) + 30);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lockRef.current || gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (480 / rect.width);
    const my = (e.clientY - rect.top) * (400 / rect.height);

    const cols = Math.ceil(Math.sqrt(cardsRef.current.length));
    const cardW = Math.min(60, (480 - 20) / cols);
    const cardH = cardW * 1.4;
    const startX = (480 - cols * cardW) / 2;

    for (let i = 0; i < cardsRef.current.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + 4);
      const y = 20 + row * (cardH + 8);
      if (mx >= x && mx <= x + cardW && my >= y && my <= y + cardH) {
        const card = cardsRef.current[i];
        if (card.matched || card.flipped || flippedRef.current.length >= 2) return;
        card.flipped = true;
        flippedRef.current.push(i);
        draw();

        if (flippedRef.current.length === 2) {
          movesRef.current++;
          setMoves(movesRef.current);
          lockRef.current = true;
          const [a, b] = flippedRef.current;
          if (cardsRef.current[a].rank === cardsRef.current[b].rank && cardsRef.current[a].suit === cardsRef.current[b].suit) {
            setTimeout(() => {
              cardsRef.current[a].matched = true;
              cardsRef.current[b].matched = true;
              matchedCountRef.current++;
              scoreRef.current += 100;
              setScore(scoreRef.current);
              flippedRef.current = [];
              lockRef.current = false;
              draw();
              if (matchedCountRef.current === cardsRef.current.length / 2) {
                scoreRef.current += 500 - movesRef.current * 10;
                setScore(scoreRef.current);
                setGameState("gameover");
                if (scoreRef.current > highScore) setHighScore(scoreRef.current);
              }
            }, 500);
          } else {
            setTimeout(() => {
              cardsRef.current[a].flipped = false;
              cardsRef.current[b].flipped = false;
              flippedRef.current = [];
              lockRef.current = false;
              draw();
            }, 800);
          }
        }
        break;
      }
    }
  }, [gameState, draw, highScore]);

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
    scoreRef.current = 0;
    movesRef.current = 0;
    setScore(0);
    setMoves(0);
    initCards(10);
    setGameState("playing");
  }, [initCards]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Card Flip Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Moves: <span className="text-blue-400 font-bold">{moves}</span></span>
      </div>
      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Click cards to flip them. Match pairs!</p>
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
            <p className="text-gray-400">in {moves} moves</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
