"use client";

import { useState, useCallback, useEffect } from "react";

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

export default function Spades() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [cpuHand, setCpuHand] = useState<Card[]>([]);
  const [trickCount, setTrickCount] = useState(0);
  const [playerTricks, setPlayerTricks] = useState(0);
  const [cpuTricks, setCpuTricks] = useState(0);
  const [trickCards, setTrickCards] = useState<(Card & { player: string })[]>([]);
  const [message, setMessage] = useState("");
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const startGame = useCallback(() => {
    const deck = createDeck();
    setPlayerHand(deck.slice(0, 13));
    setCpuHand(deck.slice(13, 26));
    setTrickCount(0);
    setPlayerTricks(0);
    setCpuTricks(0);
    setTrickCards([]);
    setSelectedCards([]);
    setMessage("Select cards to play (max 4 per trick)");
    setGameState("playing");
  }, []);

  const playCards = useCallback(() => {
    if (selectedCards.length === 0) return;

    const played = selectedCards.map((i) => ({ ...playerHand[i], player: "You" }));
    const newTrick = [...trickCards, ...played];
    setTrickCards(newTrick);

    const cpuPlayCount = Math.min(4 - newTrick.length, cpuHand.length);
    const cpuPlayed: (Card & { player: string })[] = [];
    const remainingCpu = [...cpuHand];
    for (let i = 0; i < cpuPlayCount; i++) {
      const idx = Math.floor(Math.random() * remainingCpu.length);
      cpuPlayed.push({ ...remainingCpu[idx], player: "CPU" });
      remainingCpu.splice(idx, 1);
    }
    setCpuHand(remainingCpu);

    const allTrick = [...newTrick, ...cpuPlayed];
    const winner = allTrick.reduce((w, c) => {
      if (c.suit === "♠" && (!w || w.suit !== "♠" || RANKS.indexOf(c.rank) > RANKS.indexOf(w.rank))) return c;
      if (c.suit === "♠" && w?.suit === "♠") return RANKS.indexOf(c.rank) > RANKS.indexOf(w.rank) ? c : w;
      if (c.suit === allTrick[0].suit && (!w || c.suit === w.suit) && RANKS.indexOf(c.rank) > RANKS.indexOf(w.rank)) return c;
      return w;
    }, allTrick[0]);

    if (winner.player === "You") {
      setPlayerTricks((t) => t + allTrick.length);
      setMessage(`You won the trick! (+${allTrick.length})`);
    } else {
      setCpuTricks((t) => t + allTrick.length);
      setMessage(`CPU won the trick! (+${allTrick.length})`);
    }

    const newPlayerHand = playerHand.filter((_, i) => !selectedCards.includes(i));
    setPlayerHand(newPlayerHand);
    setSelectedCards([]);
    setTrickCards([]);
    setTrickCount((tc) => tc + 1);
  }, [selectedCards, playerHand, cpuHand, trickCards]);

  useEffect(() => {
    if (trickCount >= 13 && gameState === "playing") {
      setGameState("gameover");
      setMessage(playerTricks > cpuTricks ? "You won the round!" : playerTricks < cpuTricks ? "CPU won the round!" : "It's a tie!");
    }
  }, [trickCount, playerTricks, cpuTricks, gameState]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Spades</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Your Tricks: <span className="text-green-400 font-bold">{playerTricks}</span></span>
        <span className="text-gray-400">CPU Tricks: <span className="text-red-400 font-bold">{cpuTricks}</span></span>
        <span className="text-gray-400">Round: <span className="text-blue-400 font-bold">{Math.min(trickCount + 1, 13)}/13</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Win tricks by playing highest cards. Spades are trump!</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="text-sm text-gray-400">Selected: {selectedCards.length}/4</div>
          <div className="flex flex-wrap gap-1 justify-center max-w-lg">
            {playerHand.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedCards((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 4 ? [...prev, i] : prev)}
                className={`w-12 h-16 rounded flex flex-col items-center justify-center border-2 transition ${
                  selectedCards.includes(i) ? "border-yellow-400 bg-yellow-100" : "border-gray-600 bg-white"
                }`}
              >
                <span className={`text-xs font-bold ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.rank}</span>
                <span className={`text-sm ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.suit}</span>
              </button>
            ))}
          </div>
          <button
            onClick={playCards}
            disabled={selectedCards.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50"
          >
            Play Cards
          </button>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">{message}</p>
            <p className="text-xl text-white mt-2">You: {playerTricks} | CPU: {cpuTricks}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
