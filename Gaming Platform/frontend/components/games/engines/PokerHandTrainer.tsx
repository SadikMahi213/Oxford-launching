"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const RANK_VALUE: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  J: 11, Q: 12, K: 13, A: 14,
};

type Card = { rank: string; suit: string };

const HAND_NAMES = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
];

const HAND_DESCRIPTIONS = [
  "Highest card wins",
  "Two cards of same rank",
  "Two different pairs",
  "Three cards of same rank",
  "Five consecutive cards",
  "All same suit",
  "Three of a kind + a pair",
  "Four cards of same rank",
  "Straight all same suit",
  "10-J-Q-K-A same suit",
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function evaluateHand(cards: Card[]): number {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  const unique = [...new Set(values)];
  let isStraight = false;
  if (unique.length === 5) {
    if (values[4] - values[0] === 4) isStraight = true;
    if (values[3] - values[0] === 3 && values[4] === 14 && values[0] === 2) isStraight = true;
  }

  const counts: Record<number, number> = {};
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  const countArr = Object.values(counts).sort((a, b) => b - a);

  if (isStraight && isFlush) {
    if (values[0] === 10) return 9;
    return 8;
  }
  if (countArr[0] === 4) return 7;
  if (countArr[0] === 3 && countArr[1] === 2) return 6;
  if (isFlush) return 5;
  if (isStraight) return 4;
  if (countArr[0] === 3) return 3;
  if (countArr[0] === 2 && countArr[1] === 2) return 2;
  if (countArr[0] === 2) return 1;
  return 0;
}

export default function PokerHandTrainer() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [hand, setHand] = useState<Card[]>([]);
  const [correctRank, setCorrectRank] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const dealHand = useCallback(() => {
    const deck = createDeck();
    const h = deck.slice(0, 5);
    const rank = evaluateHand(h);
    setHand(h);
    setCorrectRank(rank);
    setRevealed(false);
    setFeedback(null);

    const opts = new Set<number>([rank]);
    while (opts.size < 4) {
      opts.add(Math.floor(Math.random() * 10));
    }
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setQuestionNum(0);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setGameState("playing");
    dealHand();
  }, [dealHand]);

  const handleGuess = useCallback(
    (rank: number) => {
      if (gameState !== "playing" || feedback) return;

      setRevealed(true);
      setTotalAnswered((t) => t + 1);

      if (rank === correctRank) {
        const bonus = streak * 5;
        const points = 10 + bonus;
        setScore((s) => s + points);
        setStreak((s) => s + 1);
        setTotalCorrect((c) => c + 1);
        setFeedback("correct");
      } else {
        setStreak(0);
        setFeedback("wrong");
        if (score > highScore) setHighScore(score);
      }

      setTimeout(() => {
        setQuestionNum((q) => q + 1);
        dealHand();
      }, 2000);
    },
    [gameState, correctRank, streak, score, highScore, feedback, dealHand]
  );

  const cardColor = (suit: string): string => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-white";
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Poker Hand Trainer</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Streak: <span className="text-orange-400 font-bold">{streak}</span></span>
        <span className="text-gray-400">Accuracy: <span className="text-blue-400 font-bold">{totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Identify the poker hand from 5 cards! Learn hand rankings while playing.
          </p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {hand.map((card, i) => (
              <div
                key={i}
                className="w-16 h-22 bg-white rounded-lg p-2 flex flex-col items-center justify-between shadow-lg"
              >
                <span className={`text-xs font-bold ${cardColor(card.suit)}`}>{card.rank}</span>
                <span className={`text-lg ${cardColor(card.suit)}`}>{card.suit}</span>
                <span className={`text-xs font-bold ${cardColor(card.suit)}`}>{card.rank}</span>
              </div>
            ))}
          </div>

          {feedback && revealed && (
            <div className={`p-4 rounded-xl text-center w-full max-w-md ${
              feedback === "correct"
                ? "bg-green-900/50 border border-green-700"
                : "bg-red-900/50 border border-red-700"
            }`}>
              <p className={`font-bold text-lg ${feedback === "correct" ? "text-green-400" : "text-red-400"}`}>
                {feedback === "correct" ? "Correct!" : "Wrong!"}
              </p>
              <p className="text-white mt-1">
                It was: <span className="font-bold text-yellow-400">{HAND_NAMES[correctRank]}</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">{HAND_DESCRIPTIONS[correctRank]}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full max-w-md">
            {options.map((rank) => (
              <button
                key={rank}
                onClick={() => handleGuess(rank)}
                disabled={!!feedback}
                className={`py-3 rounded-xl font-bold transition-all ${
                  feedback === "correct" && rank === correctRank
                    ? "bg-green-600 text-white"
                    : feedback === "wrong" && rank === correctRank
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                } disabled:cursor-not-allowed`}
              >
                {HAND_NAMES[rank]}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm">Question {questionNum + 1}</p>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">Results</p>
            <p className="text-4xl font-bold text-green-400 mt-2">{score}</p>
            <p className="text-gray-400">{totalCorrect}/{totalAnswered} correct ({Math.round((totalCorrect / totalAnswered) * 100)}%)</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
