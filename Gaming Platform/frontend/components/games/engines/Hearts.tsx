"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const TRICKS_NEEDED = 4;

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

export default function Hearts() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [cpu1Hand, setCpu1Hand] = useState<Card[]>([]);
  const [cpu2Hand, setCpu2Hand] = useState<Card[]>([]);
  const [cpu3Hand, setCpu3Hand] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpu1Score, setCpu1Score] = useState(0);
  const [cpu2Score, setCpu2Score] = useState(0);
  const [cpu3Score, setCpu3Score] = useState(0);
  const [trickCards, setTrickCards] = useState<(Card & { player: string })[]>([]);
  const [trickCount, setTrickCount] = useState(0);
  const [message, setMessage] = useState("");
  const [trumpSuit, setTrumpSuit] = useState("♠");
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [phase, setPhase] = useState<"play" | "trick">("play");

  const startGame = useCallback(() => {
    const deck = createDeck();
    setPlayerHand(deck.slice(0, 13));
    setCpu1Hand(deck.slice(13, 26));
    setCpu2Hand(deck.slice(26, 39));
    setCpu3Hand(deck.slice(39, 52));
    setPlayerScore(0);
    setCpu1Score(0);
    setCpu2Score(0);
    setCpu3Score(0);
    setTrickCards([]);
    setTrickCount(0);
    setTrumpSuit("♠");
    setSelectedCards([]);
    setPhase("play");
    setMessage("Select cards to play (Hearts = -1 each, Q♠ = -13)");
    setGameState("playing");
  }, []);

  const playCards = useCallback(() => {
    if (selectedCards.length === 0 || selectedCards.length > 4) return;
    const played = selectedCards.map((i) => ({ ...playerHand[i], player: "You" }));
    const newTrickCards = [...trickCards, ...played];
    setTrickCards(newTrickCards);

    const cpu1Play = cpu1Hand[Math.floor(Math.random() * cpu1Hand.length)];
    const cpu2Play = cpu2Hand[Math.floor(Math.random() * cpu2Hand.length)];
    const cpu3Play = cpu3Hand[Math.floor(Math.random() * cpu3Hand.length)];

    const allPlayed = [
      ...newTrickCards,
      { ...cpu1Play, player: "CPU1" },
      { ...cpu2Play, player: "CPU2" },
      { ...cpu3Play, player: "CPU3" },
    ];

    let points = 0;
    allPlayed.forEach((c) => {
      if (c.suit === "♥") points++;
      if (c.suit === "♠" && c.rank === "Q") points += 13;
    });

    const winner = allPlayed.reduce((w, c) => {
      if (c.suit === "♠" && c.rank === "Q") return c;
      if (c.suit === trumpSuit && (!w || RANKS.indexOf(c.rank) > RANKS.indexOf(w.rank))) return c;
      return w;
    }, allPlayed[0]);

    if (winner.player === "You") {
      setPlayerScore((s) => s + points);
      setMessage(`You took the trick! +${points} points`);
    } else {
      const cpuScores = { CPU1: setCpu1Score, CPU2: setCpu2Score, CPU3: setCpu3Score };
      if (winner.player in cpuScores) {
        cpuScores[winner.player as keyof typeof cpuScores]((s) => s + points);
      }
      setMessage(`${winner.player} took the trick! ${winner.player} gets +${points} points`);
    }

    const newPlayerHand = playerHand.filter((_, i) => !selectedCards.includes(i));
    const newCpu1Hand = cpu1Hand.filter((c) => c !== cpu1Play);
    const newCpu2Hand = cpu2Hand.filter((c) => c !== cpu2Play);
    const newCpu3Hand = cpu3Hand.filter((c) => c !== cpu3Play);

    setPlayerHand(newPlayerHand);
    setCpu1Hand(newCpu1Hand);
    setCpu2Hand(newCpu2Hand);
    setCpu3Hand(newCpu3Hand);
    setSelectedCards([]);

    setTrickCount((tc) => {
      const next = tc + 1;
      if (next >= 13) {
        setGameState("gameover");
      }
      return next;
    });
  }, [selectedCards, playerHand, cpu1Hand, cpu2Hand, cpu3Hand, trickCards, trumpSuit]);

  const toggleCard = useCallback((idx: number) => {
    setSelectedCards((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : prev.length < 4 ? [...prev, idx] : prev
    );
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Hearts</h1>
      <div className="flex gap-4 text-sm flex-wrap justify-center">
        <span className="text-gray-400">You: <span className="text-green-400 font-bold">{playerScore}</span></span>
        <span className="text-gray-400">CPU1: <span className="text-red-400 font-bold">{cpu1Score}</span></span>
        <span className="text-gray-400">CPU2: <span className="text-red-400 font-bold">{cpu2Score}</span></span>
        <span className="text-gray-400">CPU3: <span className="text-red-400 font-bold">{cpu3Score}</span></span>
      </div>
      {message && <p className="text-yellow-400 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">Avoid Hearts (-1 each) and Q♠ (-13)</p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="text-sm text-gray-400">Round {trickCount + 1}/13 | Trump: {trumpSuit} | Selected: {selectedCards.length}/4</div>
          <div className="flex flex-wrap gap-1 justify-center max-w-lg">
            {playerHand.map((c, i) => (
              <button
                key={i}
                onClick={() => toggleCard(i)}
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
            disabled={selectedCards.length === 0 || selectedCards.length > 4}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50"
          >
            Play ({selectedCards.length}/4)
          </button>
        </>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">Round Over!</p>
            <p className="text-xl text-white mt-2">Your Score: {playerScore}</p>
            <p className="text-gray-400">Lower is better</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
