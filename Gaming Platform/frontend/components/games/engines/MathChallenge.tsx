"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";
type Op = "+" | "-" | "×" | "÷";

interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

const generateProblem = (difficulty: number): Problem => {
  const ops: Op[] = ["+", "-", "×"];
  if (difficulty >= 2) ops.push("÷");
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number;
  switch (op) {
    case "+":
      a = Math.floor(Math.random() * (10 + difficulty * 10)) + 1;
      b = Math.floor(Math.random() * (10 + difficulty * 10)) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * (10 + difficulty * 10)) + 5;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * (5 + difficulty * 5)) + 1;
      b = Math.floor(Math.random() * (5 + difficulty * 3)) + 1;
      answer = a * b;
      break;
    case "÷":
      b = Math.floor(Math.random() * (5 + difficulty * 3)) + 1;
      answer = Math.floor(Math.random() * (5 + difficulty * 5)) + 1;
      a = b * answer;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  return { a, b, op, answer };
};

export default function MathChallenge() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timer, setTimer] = useState(15);
  const [difficulty, setDifficulty] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setUserAnswer("");
    setTimer(difficulty >= 2 ? 12 : 15);
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficulty]);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setLives(3);
    setDifficulty(1);
    setGameState("playing");
    nextProblem();
  }, [nextProblem]);

  useEffect(() => {
    if (gameState === "playing" && timer > 0 && !feedback) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setLives((l) => {
              if (l <= 1) {
                setGameState("gameover");
                if (score > highScore) setHighScore(score);
                return 0;
              }
              return l - 1;
            });
            setStreak(0);
            setTimeout(() => nextProblem(), 500);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timer, feedback, score, highScore, nextProblem]);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing" || !problem || feedback) return;
    const ans = parseInt(userAnswer);
    if (isNaN(ans)) return;

    if (timerRef.current) clearInterval(timerRef.current);

    if (ans === problem.answer) {
      const timeBonus = Math.floor(timer * 2);
      const streakBonus = streak * 5;
      const points = 10 + timeBonus + streakBonus;
      setScore((s) => s + points);
      setStreak((s) => s + 1);
      setFeedback("correct");

      if (streak > 0 && streak % 5 === 0) {
        setDifficulty((d) => Math.min(d + 1, 3));
      }
    } else {
      setLives((l) => {
        if (l <= 1) {
          setGameState("gameover");
          if (score > highScore) setHighScore(score);
          return 0;
        }
        return l - 1;
      });
      setStreak(0);
      setFeedback("wrong");
    }

    setTimeout(() => nextProblem(), 1000);
  }, [gameState, problem, userAnswer, timer, streak, score, highScore, feedback, nextProblem]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSubmit]);

  const timerPercent = (timer / (difficulty >= 2 ? 12 : 15)) * 100;
  const timerColor = timer > 10 ? "bg-green-500" : timer > 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Math Challenge</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Streak: <span className="text-orange-400 font-bold">{streak}</span></span>
        <span className="text-gray-400">Lives: <span className="text-red-400 font-bold">{"❤️".repeat(lives)}</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Solve math problems before time runs out! Difficulty increases as you build streaks.
          </p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && problem && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-xs h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPercent}%` }} />
          </div>
          <p className="text-gray-400 text-sm">{timer}s</p>

          <div className="text-4xl font-bold text-white font-mono tracking-wider">
            {problem.a} {problem.op} {problem.b} = ?
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-32 px-4 py-3 bg-gray-700 text-white rounded-lg text-center text-2xl font-bold border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="?"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!!feedback}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50"
            >
              ✓
            </button>
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl text-center text-lg font-bold ${
              feedback === "correct" ? "bg-green-900/50 text-green-400 border border-green-700" : "bg-red-900/50 text-red-400 border border-red-700"
            }`}>
              {feedback === "correct"
                ? `Correct! +${10 + Math.floor(timer * 2) + streak * 5}`
                : `Wrong! Answer: ${problem.answer}`}
            </div>
          )}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-4xl font-bold text-white mt-2">{score}</p>
            <p className="text-gray-400">Best streak: {streak}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
