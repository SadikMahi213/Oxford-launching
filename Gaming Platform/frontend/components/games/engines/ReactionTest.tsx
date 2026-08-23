"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function ReactionTest() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [bgColor, setBgColor] = useState("#374151");
  const [message, setMessage] = useState("Click to start");
  const [results, setResults] = useState<number[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [tooEarly, setTooEarly] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxAttempts = 5;

  const startTest = useCallback(() => {
    setResults([]);
    setCurrentAttempt(0);
    setGameState("playing");
    startRound();
  }, []);

  const startRound = useCallback(() => {
    setWaitingForClick(false);
    setTooEarly(false);
    setBgColor("#EF4444");
    setMessage("Wait for green...");
    const delay = 1500 + Math.random() * 3500;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setBgColor("#10B981");
      setMessage("CLICK NOW!");
      setStartTime(Date.now());
      setWaitingForClick(true);
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (gameState !== "playing") return;

    if (tooEarly) {
      startRound();
      return;
    }

    if (!waitingForClick) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTooEarly(true);
      setBgColor("#F59E0B");
      setMessage("Too early! Click to try again");
      return;
    }

    const reactionTime = Date.now() - startTime;
    const newResults = [...results, reactionTime];
    setResults(newResults);
    setWaitingForClick(false);

    if (currentAttempt + 1 >= maxAttempts) {
      setGameState("gameover");
      setBgColor("#374151");
      const avg = Math.round(newResults.reduce((a, b) => a + b, 0) / newResults.length);
      setMessage(`Average: ${avg}ms`);
    } else {
      setCurrentAttempt((c) => c + 1);
      setBgColor("#3B82F6");
      setMessage(`${reactionTime}ms - Round ${currentAttempt + 2}/${maxAttempts}`);
      setTimeout(startRound, 1500);
    }
  }, [gameState, waitingForClick, startTime, results, currentAttempt, tooEarly, startRound]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClick, gameState]);

  const getRating = (ms: number) => {
    if (ms < 200) return { text: "Lightning!", color: "text-yellow-400" };
    if (ms < 300) return { text: "Fast!", color: "text-green-400" };
    if (ms < 400) return { text: "Good", color: "text-blue-400" };
    if (ms < 500) return { text: "Average", color: "text-gray-400" };
    return { text: "Slow", color: "text-red-400" };
  };

  const avgMs = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : 0;
  const bestMs = results.length > 0 ? Math.min(...results) : 0;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Reaction Time Test</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">
          Round: <span className="text-white font-bold">{Math.min(currentAttempt + 1, maxAttempts)}/{maxAttempts}</span>
        </span>
        {results.length > 0 && (
          <>
            <span className="text-gray-400">
              Best: <span className="text-green-400 font-bold">{bestMs}ms</span>
            </span>
            <span className="text-gray-400">
              Avg: <span className="text-blue-400 font-bold">{avgMs}ms</span>
            </span>
          </>
        )}
      </div>

      <button
        onClick={handleClick}
        className="w-full max-w-md aspect-[2/1] rounded-2xl flex flex-col items-center justify-center text-2xl font-bold transition-colors duration-100 cursor-pointer select-none"
        style={{ backgroundColor: bgColor }}
      >
        <span className="text-white drop-shadow-lg">{message}</span>
        {gameState === "playing" && !waitingForClick && !tooEarly && (
          <span className="text-white/60 text-sm mt-2">Space bar works too</span>
        )}
      </button>

      {gameState === "idle" && (
        <p className="text-gray-400 text-center text-sm max-w-md">
          When the screen turns green, click as fast as you can! Your reaction time will be measured.
        </p>
      )}

      {results.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <h3 className="text-white font-medium">Results</h3>
          {results.map((ms, i) => {
            const rating = getRating(ms);
            return (
              <div key={i} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                <span className="text-gray-400 text-sm">Round {i + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((ms / 800) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-16 text-right">{ms}ms</span>
                  <span className={`text-sm font-medium w-20 text-right ${rating.color}`}>
                    {rating.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-gray-400">Your average reaction time</p>
            <p className="text-4xl font-bold text-white mt-2">{avgMs}ms</p>
            <p className={`font-medium mt-1 ${getRating(avgMs).color}`}>{getRating(avgMs).text}</p>
          </div>
          <button
            onClick={startTest}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
