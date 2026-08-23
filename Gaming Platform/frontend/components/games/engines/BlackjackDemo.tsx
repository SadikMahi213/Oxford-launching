"use client";

import { useState, useCallback, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

interface Card { suit: string; rank: string; }

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
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

function cardValue(c: Card): number {
  const idx = RANKS.indexOf(c.rank);
  return idx === 0 ? 14 : idx + 1;
}

function cardColor(c: Card): string {
  return c.suit === "♥" || c.suit === "♦" ? "#DC2626" : "#111";
}

function renderCard(ctx: CanvasRenderingContext2D, c: Card, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#FFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = cardColor(c);
  ctx.font = `bold ${w * 0.25}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(c.rank, x + 4, y + 16);
  ctx.font = `${w * 0.35}px sans-serif`;
  ctx.fillText(c.suit, x + 4, y + 38);
  ctx.font = `bold ${w * 0.25}px sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(c.rank, x + w - 4, y + h - 6);
}

export default function BlackjackDemo() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [dealerTotal, setDealerTotal] = useState(0);
  const [result, setResult] = useState("");
  const [score, setScore] = useState(1000);
  const [bet, setBet] = useState(100);
  const [highScore, setHighScore] = useState(1000);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scoreHand = (hand: Card[]): number => {
    let total = 0;
    let aces = 0;
    for (const c of hand) {
      if (c.rank === "A") { aces++; total += 11; }
      else if (["K", "Q", "J"].includes(c.rank)) total += 10;
      else total += parseInt(c.rank);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#065F46";
    ctx.fillRect(0, 0, 480, 320);

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Dealer", 240, 25);
    dealerHand.forEach((c, i) => {
      renderCard(ctx, c, 140 + i * 55, 35, 50, 70);
    });

    ctx.fillText("Player", 240, 140);
    playerHand.forEach((c, i) => {
      renderCard(ctx, c, 140 + i * 55, 150, 50, 70);
    });

    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`Total: ${playerTotal}`, 240, 240);

    if (dealerHand.length > 0) {
      ctx.fillText(`Dealer: ${dealerTotal}`, 240, 120);
    }

    if (result) {
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = result.includes("Win") ? "#22C55E" : result.includes("Lose") ? "#EF4444" : "#FBBF24";
      ctx.fillText(result, 240, 280);
    }
  }, [playerHand, dealerHand, playerTotal, dealerTotal, result]);

  const deal = useCallback(() => {
    const deck = createDeck();
    const pHand = [deck.pop()!, deck.pop()!];
    const dHand = [deck.pop()!, deck.pop()!];
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setPlayerTotal(scoreHand(pHand));
    setDealerTotal(scoreHand(dHand));
    setResult("");
    setGameState("playing");
  }, []);

  const hit = useCallback(() => {
    const deck = createDeck();
    setPlayerHand((prev) => {
      const newHand = [...prev, deck.pop()!];
      const total = scoreHand(newHand);
      setPlayerTotal(total);
      if (total > 21) {
        setScore((s) => {
          const ns = s - bet;
          setGameState("gameover");
          setResult("Bust! You Lose");
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
      }
      return newHand;
    });
  }, [bet, highScore]);

  const stand = useCallback(() => {
    let dHand = [...dealerHand];
    let dTotal = scoreHand(dHand);
    while (dTotal < 17) {
      const deck = createDeck();
      dHand.push(deck.pop()!);
      dTotal = scoreHand(dHand);
    }
    setDealerHand(dHand);
    setDealerTotal(dTotal);

    const pTotal = playerTotal;
    if (dTotal > 21 || pTotal > dTotal) {
      setScore((s) => {
        const ns = s + bet;
        setResult("You Win!");
        setGameState("gameover");
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    } else if (pTotal === dTotal) {
      setResult("Push!");
      setGameState("gameover");
    } else {
      setScore((s) => {
        const ns = s - bet;
        setResult("Dealer Wins!");
        setGameState("gameover");
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
  }, [dealerHand, playerTotal, bet, highScore]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Blackjack</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Balance: <span className="text-green-400 font-bold">${score}</span></span>
        <span className="text-gray-400">Bet: <span className="text-yellow-400 font-bold">${bet}</span></span>
      </div>
      {highScore > 1000 && <p className="text-yellow-400 text-sm">Best: ${highScore}</p>}
      <canvas ref={canvasRef} width={480} height={320} className="rounded-lg border border-gray-700" style={{ maxWidth: "100%" }} />
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Get closer to 21 than the dealer without going over</p>
          <div className="flex gap-2">
            {[50, 100, 250, 500].map((b) => (
              <button key={b} onClick={() => setBet(b)} className={`px-3 py-2 rounded text-sm font-bold ${bet === b ? "bg-yellow-600" : "bg-gray-700"} text-white`}>${b}</button>
            ))}
          </div>
          <button onClick={() => { deal(); setGameState("playing"); }} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Deal</button>
        </div>
      )}
      {gameState === "playing" && (
        <div className="flex gap-4">
          <button onClick={hit} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">Hit</button>
          <button onClick={stand} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition">Stand</button>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => { setGameState("idle"); setResult(""); }} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">New Round</button>
        </div>
      )}
    </div>
  );
}
