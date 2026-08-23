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

export default function GoFish() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [cpuHand, setCpuHand] = useState<Card[]>([]);
  const [playerBooks, setPlayerBooks] = useState<string[]>([]);
  const [cpuBooks, setCpuBooks] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [selectedRank, setSelectedRank] = useState("");
  const [turnMessage, setTurnMessage] = useState("");

  const countRank = (hand: Card[], rank: string) => hand.filter((c) => c.rank === rank).length;

  const removeRank = (hand: Card[], rank: string): Card[] => {
    const idx = hand.findIndex((c) => c.rank === rank);
    if (idx === -1) return hand;
    const newHand = [...hand];
    newHand.splice(idx, 1);
    return newHand;
  };

  const checkBooks = (hand: Card[]): { books: string[]; remaining: Card[] } => {
    const books: string[] = [];
    let remaining = [...hand];
    for (const rank of RANKS) {
      const count = countRank(remaining, rank);
      if (count >= 4) {
        books.push(rank);
        for (let i = 0; i < 4; i++) remaining = removeRank(remaining, rank);
      }
    }
    return { books, remaining };
  };

  const startGame = useCallback(() => {
    const deck = createDeck();
    let pHand = deck.slice(0, 7);
    let cHand = deck.slice(7, 14);

    const pCheck = checkBooks(pHand);
    pHand = pCheck.remaining;
    const cCheck = checkBooks(cHand);
    cHand = cCheck.remaining;

    setPlayerHand(pHand);
    setCpuHand(cHand);
    setPlayerBooks(pCheck.books);
    setCpuBooks(cCheck.books);
    setScore(pCheck.books.length * 100);
    setMessage("Ask for a rank from the opponent!");
    setSelectedRank("");
    setTurnMessage("");
    setGameState("playing");
  }, []);

  const askRank = useCallback((rank: string) => {
    if (gameState !== "playing" || !rank) return;

    const cpuHas = countRank(cpuHand, rank);
    if (cpuHas > 0) {
      let newPHand = [...playerHand];
      let newCHand = [...cpuHand];
      for (let i = 0; i < cpuHas; i++) {
        const card = newCHand.find((c) => c.rank === rank)!;
        newPHand.push(card);
        newCHand = newCHand.filter((c) => c !== card);
      }
      setPlayerHand(newPHand);
      setCpuHand(newCHand);
      setTurnMessage(`Got ${cpuHas} ${rank}(s) from CPU! Go again!`);
      setMessage("Ask for another rank!");
    } else {
      setTurnMessage("Go Fish!");
      setPlayerHand((prev) => {
        const newDeck = createDeck();
        const drawn = newDeck[0];
        const newHand = [...prev, drawn];
        const { books, remaining } = checkBooks(newHand);
        if (books.length > 0) {
          setPlayerBooks((pb) => [...pb, ...books]);
          setScore((s) => s + books.length * 100);
        }
        return remaining;
      });

      setTimeout(() => {
        const ranks = RANKS.filter((r) => countRank(cpuHand, r) > 0);
        if (ranks.length > 0) {
          const askRank = ranks[Math.floor(Math.random() * ranks.length)];
          setPlayerHand((pHand) => {
            const has = countRank(pHand, askRank);
            if (has > 0) {
              setCpuHand((cHand) => {
                let newC = [...cHand];
                let newP = [...pHand];
                for (let i = 0; i < has; i++) {
                  const card = newP.find((c) => c.rank === askRank)!;
                  newC.push(card);
                  newP = newP.filter((c) => c !== card);
                }
                setPlayerHand(newP);
                const { books, remaining } = checkBooks(newC);
                if (books.length > 0) {
                  setCpuBooks((cb) => [...cb, ...books]);
                }
                return remaining;
              });
              setMessage(`CPU asks for ${askRank}. You give ${has}!`);
            } else {
              setMessage(`CPU asks for ${askRank}. Go Fish!`);
            }
            return pHand;
          });
        }
      }, 500);
    }

    const pBooks = checkBooks(playerHand).books;
    const cBooks = checkBooks(cpuHand).books;
    if (playerHand.length === 0 && cpuHand.length === 0) {
      setGameState("gameover");
    }
  }, [gameState, playerHand, cpuHand]);

  const uniqueRanks = RANKS.filter((r) => countRank(playerHand, r) > 0);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Go Fish</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Your Books: <span className="text-blue-400 font-bold">{playerBooks.length}</span></span>
        <span className="text-gray-400">CPU Books: <span className="text-red-400 font-bold">{cpuBooks.length}</span></span>
      </div>
      {turnMessage && <p className="text-yellow-400 text-sm">{turnMessage}</p>}
      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Ask for ranks to collect books of 4</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}
      {gameState === "playing" && (
        <>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {playerHand.map((c, i) => (
              <div key={i} className="w-12 h-16 bg-white rounded flex flex-col items-center justify-center border border-gray-300">
                <span className={`text-xs font-bold ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.rank}</span>
                <span className={`text-sm ${c.suit === "♥" || c.suit === "♦" ? "text-red-600" : "text-gray-900"}`}>{c.suit}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">Ask for a rank you have:</p>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {uniqueRanks.map((rank) => (
              <button key={rank} onClick={() => askRank(rank)} className="px-3 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition">{rank}</button>
            ))}
          </div>
          {message && <p className="text-gray-300 text-sm text-center">{message}</p>}
          {playerBooks.length > 0 && (
            <div className="text-center">
              <p className="text-gray-400 text-xs">Your Books: {playerBooks.join(", ")}</p>
            </div>
          )}
          {cpuBooks.length > 0 && (
            <div className="text-center">
              <p className="text-gray-400 text-xs">CPU Books: {cpuBooks.join(", ")}</p>
            </div>
          )}
        </>
      )}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {playerBooks.length > cpuBooks.length ? "You Win!" : cpuBooks.length > playerBooks.length ? "CPU Wins!" : "It's a Tie!"}
            </p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
