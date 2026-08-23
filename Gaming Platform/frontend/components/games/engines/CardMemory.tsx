"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";
type Card = { id: number; suit: string; rank: string; flipped: boolean; matched: boolean };

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export default function CardMemory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const generateCards = useCallback(() => {
    const pairsNeeded = 8;
    const deck: { suit: string; rank: string }[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    const selected = shuffleArray(deck).slice(0, pairsNeeded);
    const cardPairs = selected.flatMap((c, i) => [
      { id: i * 2, suit: c.suit, rank: c.rank, flipped: false, matched: false },
      { id: i * 2 + 1, suit: c.suit, rank: c.rank, flipped: false, matched: false },
    ]);
    return shuffleArray(cardPairs);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Moves: ${moves} | Time: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`, canvas.width / 2, 20);

    const cols = 4;
    const padding = 20;
    const gap = 10;
    const cardW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const cardH = cardW * 1.4;

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cardW + gap);
      const y = 35 + padding + row * (cardH + gap);

      if (card.matched) {
        ctx.fillStyle = "#166534";
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 8);
        ctx.fill();
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#22C55E";
        ctx.font = `${cardW * 0.3}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${card.suit}${card.rank}`, x + cardW / 2, y + cardH / 2);
      } else if (card.flipped) {
        ctx.fillStyle = "#1E3A5F";
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 8);
        ctx.fill();
        ctx.strokeStyle = "#60A5FA";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = card.suit === "♥" || card.suit === "♦" ? "#EF4444" : "#FFFFFF";
        ctx.font = `bold ${cardW * 0.3}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${card.suit}${card.rank}`, x + cardW / 2, y + cardH / 2);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
        grad.addColorStop(0, "#7C3AED");
        grad.addColorStop(1, "#5B21B6");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 8);
        ctx.fill();
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#C4B5FD";
        ctx.font = `${cardW * 0.25}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♠", x + cardW / 2, y + cardH / 2);
      }
    });
  }, [cards, moves, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || flippedIds.length >= 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cols = 4;
    const padding = 20;
    const gap = 10;
    const cardW = (canvas.width - padding * 2 - gap * (cols - 1)) / cols;
    const cardH = cardW * 1.4;

    for (let i = 0; i < cards.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cardW + gap);
      const y = 35 + padding + row * (cardH + gap);
      if (clickX >= x && clickX <= x + cardW && clickY >= y && clickY <= y + cardH) {
        if (!cards[i].flipped && !cards[i].matched) {
          handleCardClick(i);
        }
        break;
      }
    }
  }, [gameState, cards, flippedIds]);

  const handleCardClick = useCallback((index: number) => {
    if (gameState !== "playing" || flippedIds.length >= 2) return;
    if (cards[index].flipped || cards[index].matched) return;

    const newCards = cards.map((c, i) => i === index ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newFlipped = [...flippedIds, index];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].rank === newCards[a].rank && newCards[a].suit === newCards[b].suit) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          ));
          setFlippedIds([]);
          setScore(s => s + 200);
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
        }, 1000);
      }
    }
  }, [gameState, cards, flippedIds]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const matched = cards.filter(c => c.matched).length;
    if (matched === cards.length && cards.length > 0) {
      const bonus = Math.max(500 - moves * 10 - timer * 2, 100);
      setScore(s => s + bonus);
      if (score + bonus > highScore) setHighScore(score + bonus);
      setGameState("gameover");
    }
  }, [cards, gameState, moves, timer, score, highScore]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const startGame = useCallback(() => {
    setCards(generateCards());
    setFlippedIds([]);
    setMoves(0);
    setTimer(0);
    setScore(0);
    setGameState("playing");
  }, [generateCards]);

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
      <h1 className="text-2xl font-bold text-white">Card Memory</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Moves: <span className="text-white font-bold">{moves}</span></span>
        <span className="text-gray-400">Pairs: <span className="text-green-400 font-bold">{cards.filter(c => c.matched).length / 2}/8</span></span>
        <span className="text-gray-400">Score: <span className="text-yellow-400 font-bold">{score}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={460}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Match all card pairs!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-green-400">All Matched!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <p className="text-gray-300">Moves: {moves}</p>
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
