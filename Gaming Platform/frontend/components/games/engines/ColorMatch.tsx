"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const STROOP_DATA = [
  { word: "RED", color: "#EF4444" },
  { word: "BLUE", color: "#3B82F6" },
  { word: "GREEN", color: "#10B981" },
  { word: "YELLOW", color: "#EAB308" },
  { word: "PURPLE", color: "#8B5CF6" },
  { word: "ORANGE", color: "#F97316" },
];

const COLOR_NAMES = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE"];
const COLOR_MAP: Record<string, string> = {
  RED: "#EF4444",
  BLUE: "#3B82F6",
  GREEN: "#10B981",
  YELLOW: "#EAB308",
  PURPLE: "#8B5CF6",
  ORANGE: "#F97316",
};

export default function ColorMatch() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timer, setTimer] = useState(30);
  const [wordText, setWordText] = useState("");
  const [wordColor, setWordColor] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [highScore, setHighScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackRef = useRef<NodeJS.Timeout | null>(null);

  const generateRound = useCallback(() => {
    const textColorIdx = Math.floor(Math.random() * COLOR_NAMES.length);
    let wordIdx: number;
    do {
      wordIdx = Math.floor(Math.random() * COLOR_NAMES.length);
    } while (wordIdx === textColorIdx);

    const word = COLOR_NAMES[wordIdx];
    const color = COLOR_NAMES[textColorIdx];
    setWordText(word);
    setWordColor(COLOR_MAP[color]);

    const correctOption = color;
    const wrongOptions = COLOR_NAMES.filter((c) => c !== color);
    const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [correctOption, ...shuffledWrong].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setTimer(30);
    setFeedback(null);
    generateRound();
    setGameState("playing");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameState("gameover");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [generateRound]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackRef.current) clearTimeout(feedbackRef.current);
    };
  }, []);

  const handleAnswer = useCallback(
    (selected: string) => {
      if (gameState !== "playing" || feedback) return;

      const isCorrect = selected === wordColor;

      if (feedbackRef.current) clearTimeout(feedbackRef.current);

      if (isCorrect) {
        setScore((s) => s + 10 + Math.floor(timer / 3));
        setFeedback("correct");
      } else {
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            clearInterval(timerRef.current!);
            setGameState("gameover");
          }
          return newLives;
        });
        setFeedback("wrong");
      }

      feedbackRef.current = setTimeout(() => {
        setFeedback(null);
        if (gameState === "playing") generateRound();
      }, 600);
    },
    [wordColor, gameState, feedback, timer, generateRound]
  );

  useEffect(() => {
    if (gameState === "gameover" && score > highScore) {
      setHighScore(score);
    }
  }, [gameState, score, highScore]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Color Match</h1>
      <p className="text-gray-400 text-sm text-center max-w-md">
        Click the color that the WORD is written in, not what it says!
      </p>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-white font-bold">{score}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(Math.max(0, lives))}</span></span>
        <span className="text-gray-400">Time: <span className="text-blue-400 font-bold">{timer}s</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

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
          <div className="h-48 flex items-center justify-center">
            <span
              className="text-6xl font-black tracking-wider"
              style={{ color: wordColor }}
            >
              {wordText}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={!!feedback}
                className={`py-4 rounded-xl font-bold text-lg uppercase transition-all ${
                  feedback === "correct" && opt === wordColor
                    ? "bg-green-600 text-white scale-105"
                    : feedback === "wrong" && opt === wordColor
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                } ${feedback === "wrong" && opt !== wordColor ? "bg-red-900/50" : ""}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">Time's Up!</p>
            <p className="text-4xl font-bold text-green-400 mt-2">{score} points</p>
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
