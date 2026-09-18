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

export default function CrazyEights() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [cpuHand, setCpuHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [stockPile, setStockPile] = useState<Card[]>([]);
  const [currentSuit, setCurrentSuit] = useState("♠");
  const [message, setMessage] = useState("");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const topCard = discardPile[discardPile.length - 1];

  const canPlay = useCallback((card: Card) => {
    if (!topCard) return true;
    if (card.rank === "8") return true;
    if (card.suit === currentSuit) return true;
    if (card.rank === topCard.rank) return true;
    return false;
  }, [topCard, currentSuit]);

  const startGame = useCallback(() => {
    const deck = createDeck();
    const pHand = deck.slice(0, 7);
    const cHand = deck.slice(7, 14);
    const discard = [deck[14]];
    const stock = deck.slice(15);

    setPlayerHand(pHand);
    setCpuHand(cHand);
    setDiscardPile(discard);
    setStockPile(stock);
    setCurrentSuit(discard[0].suit);
    setSelectedCard(null);
    setMessage("Your turn! Play a matching card or draw.");
    setGameState("playing");
  }, []);

  const playCard = useCallback((idx: number, suitOverride?: string) => {
    const card = playerHand[idx];
    if (!canPlay(card)) return;

    const newHand = playerHand.filter((_, i) => i !== idx);
    const playedCard = { ...card };
    setPlayerHand(newHand);
    setDiscardPile((prev) => [...prev, playedCard]);

    if (card.rank === "8" && suitOverride) {
      setCurrentSuit(suitOverride);
      setMessage(`You played 8! Suit changed to ${suitOverride}`);
    } else {
      setCurrentSuit(card.suit);
      setMessage(`You played ${card.rank}${card.suit}`);
    }

    if (newHand.length === 0) {
      setGameState("gameover");
      setMessage("You Win!");
      return;
    }

    setTimeout(() => {
      setCpuHand((cHand) => {
        let newCpu = [...cHand];
        let drawn = false;
        for (let i = 0; i < newCpu.length; i++) {
          const c = newCpu[i];
          const suits = [card.suit, currentSuit];
          if (c.rank === "8" || c.suit === (suitOverride || card.suit) || c.rank === card.rank) {
            setDiscardPile((prev) => [...prev, c]);
            const removed = newCpu.splice(i, 1)[0];
            if (removed.rank === "8") {
              const cpuSuits = SUITS.filter((s) => s !== "♥");
              setCurrentSuit(cpuSuits[Math.floor(Math.random() * cpuSuits.length)]);
              setMessage(`CPU played 8! Suit changed.`);
            } else {
              setMessage(`CPU played ${c.rank}${c.suit}`);
            }
            if (newCpu.length === 0) {
              setGameState("gameover");
              setMessage("CPU Wins!");
            }
            return newCpu;
          }
        }
        if (!drawn && stockPile.length > 0) {
          const drawnCard = stockPile[0];
          newCpu.push(drawnCard);
          setStockPile((prev) => prev.slice(1));
          setMessage("CPU drew a card");
        }
        return newCpu;
      });
    }, 1000);
  }, [playerHand, canPlay, stockPile, currentSuit]);

  const drawCard = useCallback(() => {
    if (stockPile.length === 0) return;
    const card = stockPile[0];
    setStockPile((prev) => prev.slice(1));
    setPlayerHand((prev) => [...prev, card]);
    setMessage(`Drew ${card.rank}${card.suit}. Your turn.`);
  }, [stockPile]);

  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingEightIdx, setPendingEightIdx] = useState<number | null>(null);

  const handleCardClick = useCallback((idx: number) => {
    const card = playerHand[idx];
    if (card.rank === "8") {
      setPendingEightIdx(idx);
      setShowSuitPicker(true);
    } else if (canPlay(card)) {
      playCard(idx);
    }
  }, [playerHand, canPlay, playCard]);

  const pickSuit = useCallback((suit: string) => {
    if (pendingEightIdx !== null) {
      playCard(pendingEightIdx, suit);
      setPendingEightIdx(null);
      setShowSuitPicker(false);
    }
  }, [pendingEightIdx, playCard]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Crazy Eights</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Cards: <span className="text-green-400 font-bold">{playerHand.length}</span></span>
        <span className="text-gray-400">CPU Cards: <span className="text-red-400 font-bold">{cpuHand.length}</span></span>
        <span className="text-gray-400">Top: <span className="text-blue-400 font-bold">{topCard ? `${topCard.rank}${topCard.suit}` : "-"}</span></span>
        <span className="text-gray-400">Suit: <span className="text-yellow-400 font-bold">{currentSuit}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {showSuitPicker && (
        <div className="flex gap-2">
          {SUITS.map((s) => (
            <button key={s} onClick={() => pickSuit(s)} className={`w-10 h-10 rounded text-xl font-bold ${s === "♥" || s === "♦" ? "bg-red-600" : "bg-gray-700"} text-white`}>{s}</button>
          ))}
        </div>
      )}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Match suit or rank. Play 8 to change suit!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="flex flex-wrap gap-1 justify-center max-w-lg">
            {playerHand.map((c, i) => (
              <button
                key={i}
                onClick={() => handleCardClick(i)}
                className={`w-12 h-16 rounded flex flex-col items-center justify-center border-2 transition ${
                  canPlay(c) ? "border-green-400 hover:bg-green-50 cursor-pointer" : "border-gray-600 opacity-50"
                } bg-white`}
              >
                <span className={`text-xs font-bold ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.rank}</span>
                <span className={`text-sm ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.suit}</span>
              </button>
            ))}
          </div>
          <button
            onClick={drawCard}
            disabled={stockPile.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50"
          >
            Draw Card ({stockPile.length} left)
          </button>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-2xl font-bold ${message.includes("You") ? "text-green-400" : "text-red-400"}`}>{message}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
