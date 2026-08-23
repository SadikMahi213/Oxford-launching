"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

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

function cardVal(c: Card): number {
  return RANKS.indexOf(c.rank);
}

function cardColor(c: Card): string {
  return c.suit === "♥" || c.suit === "♦" ? "#DC2626" : "#111";
}

function renderCard(ctx: CanvasRenderingContext2D, c: Card, x: number, y: number, w: number, h: number, faceUp = true) {
  if (!faceUp) {
    ctx.fillStyle = "#2563EB";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#1D4ED8";
    ctx.strokeRect(x, y, w, h);
    return;
  }
  ctx.fillStyle = "#FFF";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#999";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = cardColor(c);
  ctx.font = `bold ${w * 0.28}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(c.rank, x + 3, y + 16);
  ctx.font = `${w * 0.35}px sans-serif`;
  ctx.fillText(c.suit, x + 3, y + 38);
}

export default function CardWar() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [cpuCard, setCpuCard] = useState<Card | null>(null);
  const [playerDeckSize, setPlayerDeckSize] = useState(0);
  const [cpuDeckSize, setCpuDeckSize] = useState(0);
  const [message, setMessage] = useState("");
  const [roundResult, setRoundResult] = useState("");
  const [round, setRound] = useState(0);
  const canvasRef = useState<HTMLCanvasElement | null>(null);

  const [playerDeck, setPlayerDeck] = useState<Card[]>([]);
  const [cpuDeck, setCpuDeck] = useState<Card[]>([]);

  const startGame = useCallback(() => {
    const deck = createDeck();
    const half = Math.floor(deck.length / 2);
    setPlayerDeck(deck.slice(0, half));
    setCpuDeck(deck.slice(half));
    setPlayerDeckSize(half);
    setCpuDeckSize(half);
    setScore(0);
    setPlayerCard(null);
    setCpuCard(null);
    setMessage("");
    setRoundResult("");
    setRound(0);
    setGameState("playing");
  }, []);

  const playRound = useCallback(() => {
    if (playerDeck.length === 0 || cpuDeck.length === 0) {
      setGameState("gameover");
      setMessage(playerDeck.length > 0 ? "You Win!" : "CPU Wins!");
      return;
    }

    const pCard = playerDeck[0];
    const cCard = cpuDeck[0];
    setPlayerCard(pCard);
    setCpuCard(cCard);

    const pVal = cardVal(pCard);
    const cVal = cardVal(cCard);

    let result = "";
    let pDeck = [...playerDeck];
    let cDeck = [...cpuDeck];

    if (pVal > cVal) {
      result = "You Win Round!";
      pDeck.push(cDeck.shift()!);
      pDeck.push(pDeck.shift()!);
      setScore((s) => s + 10);
    } else if (cVal > pVal) {
      result = "CPU Wins Round!";
      cDeck.push(pDeck.shift()!);
      cDeck.push(cDeck.shift()!);
      setScore((s) => Math.max(0, s - 5));
    } else {
      result = "War! Tied!";
      if (pDeck.length >= 4 && cDeck.length >= 4) {
        const pWar = pDeck.splice(0, 3);
        const cWar = cDeck.splice(0, 3);
        if (cardVal(pDeck[0]) > cardVal(cDeck[0])) {
          cDeck.push(...pWar, ...cWar, pDeck.shift()!, cDeck.shift()!);
        } else {
          pDeck.push(...pWar, ...cWar, cDeck.shift()!, pDeck.shift()!);
        }
      }
    }

    setPlayerDeck(pDeck);
    setCpuDeck(cDeck);
    setPlayerDeckSize(pDeck.length);
    setCpuDeckSize(cDeck.length);
    setRoundResult(result);
    setRound((r) => r + 1);

    if (pDeck.length === 0 || cDeck.length === 0) {
      setTimeout(() => {
        setGameState("gameover");
        setMessage(pDeck.length > 0 ? "You Win the War!" : "CPU Wins the War!");
      }, 1000);
    }
  }, [playerDeck, cpuDeck]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Card War</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Round: <span className="text-blue-400 font-bold">{round}</span></span>
      </div>
      <div className="flex gap-8 items-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">Player ({playerDeckSize})</p>
          <div className="w-20 h-28 bg-blue-600 rounded flex items-center justify-center">
            {playerCard ? (
              <div className="w-16 h-24 bg-white rounded flex flex-col items-center justify-center">
                <span className="text-lg font-bold" style={{ color: cardColor(playerCard) }}>{playerCard.rank}</span>
                <span className="text-xl" style={{ color: cardColor(playerCard) }}>{playerCard.suit}</span>
              </div>
            ) : (
              <span className="text-white text-2xl">🂠</span>
            )}
          </div>
        </div>
        <div className="text-xl font-bold text-yellow-400">VS</div>
        <div className="text-center">
          <p className="text-gray-400 mb-2">CPU ({cpuDeckSize})</p>
          <div className="w-20 h-28 bg-red-600 rounded flex items-center justify-center">
            {cpuCard ? (
              <div className="w-16 h-24 bg-white rounded flex flex-col items-center justify-center">
                <span className="text-lg font-bold" style={{ color: cardColor(cpuCard) }}>{cpuCard.rank}</span>
                <span className="text-xl" style={{ color: cardColor(cpuCard) }}>{cpuCard.suit}</span>
              </div>
            ) : (
              <span className="text-white text-2xl">🂠</span>
            )}
          </div>
        </div>
      </div>
      {roundResult && <p className={`text-lg font-bold ${roundResult.includes("You") ? "text-green-400" : roundResult.includes("CPU") ? "text-red-400" : "text-yellow-400"}`}>{roundResult}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Higher card wins the round. War on ties!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {gameState === "playing" && (
        <button onClick={playRound} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-500 transition">Play Round</button>
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">{message}</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
