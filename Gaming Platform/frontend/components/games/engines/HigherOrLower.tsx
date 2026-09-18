"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";
type Choice = "higher" | "lower";

export default function HigherOrLower() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentCard, setCurrentCard] = useState(0);
  const [nextCard, setNextCard] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [deckUsed, setDeckUsed] = useState<number[]>([]);

  const cardColors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
  ];

  const getCardColor = (num: number) => cardColors[num % cardColors.length];

  const generateUniqueCard = useCallback((exclude: number[]) => {
    let num: number;
    do {
      num = Math.floor(Math.random() * 13) + 1;
    } while (exclude.includes(num));
    return num;
  }, []);

  const startGame = useCallback(() => {
    const first = Math.floor(Math.random() * 13) + 1;
    const second = generateUniqueCard([first]);
    setCurrentCard(first);
    setNextCard(second);
    setScore(0);
    setStreak(0);
    setFeedback("");
    setRevealed(false);
    setDeckUsed([first, second]);
    setGameState("playing");
  }, [generateUniqueCard]);

  const play = useCallback(
    (choice: Choice) => {
      const correct =
        (choice === "higher" && nextCard > currentCard) ||
        (choice === "lower" && nextCard < currentCard) ||
        (choice === "higher" && nextCard === currentCard) ||
        (choice === "lower" && nextCard === currentCard);

      setRevealed(true);

      if (currentCard === nextCard) {
        setFeedback("Equal! You always win on ties!");
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
      } else if (correct) {
        const bonus = streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
        setScore((s) => s + bonus);
        setStreak((s) => s + 1);
        setFeedback(`Correct! ${choice === "higher" ? "↑" : "↓"} +${bonus} points`);
      } else {
        const finalScore = score;
        if (finalScore > highScore) setHighScore(finalScore);
        setFeedback(`Wrong! Card was ${nextCard}. Game Over!`);
        setGameState("gameover");
        return;
      }

      setTimeout(() => {
        const newPrev = nextCard;
        const newNext = generateUniqueCard([...deckUsed, newPrev]);
        setCurrentCard(newPrev);
        setNextCard(newNext);
        setDeckUsed((prev) => [...prev, newPrev, newNext]);
        setRevealed(false);
        if (deckUsed.length > 30) setDeckUsed([newPrev]);
      }, 800);
    },
    [currentCard, nextCard, score, streak, highScore, deckUsed, generateUniqueCard]
  );

  const cardFace = (num: number, large = false) => {
    const suits = ["♠", "♥", "♦", "♣"];
    const suit = suits[num % suits.length];
    const display = num === 1 ? "A" : num === 11 ? "J" : num === 12 ? "Q" : num === 13 ? "K" : String(num);
    return (
      <div
        className={`${large ? "w-32 h-44 text-3xl" : "w-20 h-28 text-xl"} rounded-xl flex items-center justify-center font-bold shadow-lg transition-all duration-300 ${
          getCardColor(num - 1)
        } text-white border-2 border-white/30`}
      >
        <div className="flex flex-col items-center">
          <span>{display}</span>
          <span className={large ? "text-2xl" : "text-lg"}>{suit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Higher or Lower</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-white font-bold">{score}</span></span>
        <span className="text-gray-400">Streak: <span className="text-orange-400 font-bold">{streak}</span></span>
        <span className="text-gray-400">Best: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>

      {gameState === "idle" && (
        <button
          onClick={startGame}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition mt-8"
        >
          Start Game
        </button>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-gray-400 text-sm">Will the next card be higher or lower?</p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <p className="text-gray-500 text-xs">CURRENT</p>
              {cardFace(currentCard, true)}
            </div>
            <div className="text-4xl text-gray-600">→</div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-gray-500 text-xs">NEXT</p>
              {revealed ? (
                cardFace(nextCard, true)
              ) : (
                <div className="w-32 h-44 rounded-xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-500 text-4xl">
                  ?
                </div>
              )}
            </div>
          </div>

          {!revealed && (
            <div className="flex gap-4">
              <button
                onClick={() => play("higher")}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
              >
                ↑ Higher
              </button>
              <button
                onClick={() => play("lower")}
                className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-500 transition"
              >
                ↓ Lower
              </button>
            </div>
          )}

          {feedback && (
            <div className={`p-3 rounded-lg text-center font-medium ${
              feedback.includes("Correct") || feedback.includes("win")
                ? "bg-green-900/50 text-green-300 border border-green-700"
                : "bg-gray-800 text-gray-300"
            }`}>
              {feedback}
            </div>
          )}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">Final Score: {score}</p>
            <p className="text-gray-400 mt-1">Best Streak: {streak}</p>
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
