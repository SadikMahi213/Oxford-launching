"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const PUZZLES = [
  { emojis: "🌙⭐", answer: "night sky", hint: "What you see at night" },
  { emojis: "🔥🏠", answer: "firehouse", hint: "Where firefighters work" },
  { emojis: "☀️🌊", answer: "sunshine", hint: "Bright light from above" },
  { emojis: "🐟🐟🐟", answer: "school", hint: "Group of fish" },
  { emojis: "⏰🔔", answer: "alarm", hint: "Wakes you up" },
  { emojis: "🌈☁️", answer: "rainbow", hint: "Colorful arc in sky" },
  { emojis: "🎂🎉🎈", answer: "birthday", hint: "Annual celebration" },
  { emojis: "📚✏️", answer: "homework", hint: "After school task" },
  { emojis: "❄️⛄", answer: "snowman", hint: "Winter creation" },
  { emojis: "🎵🎶", answer: "music", hint: "Pleasant sounds" },
  { emojis: "🚗🛣️", answer: "road trip", hint: "Long drive" },
  { emojis: "🍕🍕🍕", answer: "dinner", hint: "Evening meal" },
  { emojis: "🐶🦴", answer: "treat", hint: "What a dog loves" },
  { emojis: "✈️☁️", answer: "flight", hint: "Air travel" },
  { emojis: "📚🔍", answer: "research", hint: "Looking things up" },
  { emojis: "🎵🎤", answer: "karaoke", hint: "Singing with music" },
  { emojis: "🎨🖌️", answer: "painting", hint: "Art with colors" },
  { emojis: "🍿📺", answer: "movie", hint: "Film at home" },
  { emojis: "🎮🏆", answer: "champion", hint: "Game winner" },
  { emojis: "💻⌨️", answer: "typing", hint: "Using a keyboard" },
];

export default function EmojiPuzzle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentPuzzle, setCurrentPuzzle] = useState(PUZZLES[0]);
  const [playerInput, setPlayerInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [hint, setHint] = useState("");
  const [timer, setTimer] = useState(20);
  const [hintVisible, setHintVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Level ${level} | Score: ${score} | Time: ${timer}s`, canvas.width / 2, 25);

    if (gameState === "playing") {
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentPuzzle.emojis, canvas.width / 2, 100);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "16px sans-serif";
      ctx.fillText("What phrase do these emoji represent?", canvas.width / 2, 160);

      if (hintVisible) {
        ctx.fillStyle = "#F59E0B";
        ctx.font = "italic 14px sans-serif";
        ctx.fillText(`Hint: ${currentPuzzle.hint}`, canvas.width / 2, 185);
      }

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 150, 200, 300, 45, 10);
      ctx.fill();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = playerInput ? "#FFFFFF" : "#64748B";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerInput || "Type your answer...", canvas.width / 2, 222);

      ctx.fillStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 80, 260, 80, 35, 8);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("Hint (H)", canvas.width / 2 - 40, 277);

      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 + 10, 260, 80, 35, 8);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Submit", canvas.width / 2 + 50, 277);

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 35;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 10);
      const ratio = timer / 20;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 10);
    }
  }, [gameState, score, level, currentPuzzle, playerInput, hintVisible, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startRound = useCallback((lvl: number) => {
    const puzzle = PUZZLES[(lvl - 1) % PUZZLES.length];
    setCurrentPuzzle(puzzle);
    setPlayerInput("");
    setHint("");
    setHintVisible(false);
    setTimer(Math.max(10, 20 - Math.floor(lvl / 3)));
    setFeedback(null);
    setGameState("playing");
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    startRound(1);
  }, [startRound]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setFeedback("wrong");
          setHighScore(h => Math.max(h, score));
          setTimeout(() => setGameState("gameover"), 800);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, score]);

  const showHint = useCallback(() => {
    setHintVisible(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (playerInput.toLowerCase().trim() === currentPuzzle.answer.toLowerCase()) {
      setFeedback("correct");
      const pts = currentPuzzle.answer.length * 15 + timer * 5 - (hintVisible ? 20 : 0);
      setScore(s => s + Math.max(pts, 10));
      const newLevel = level + 1;
      setLevel(newLevel);
      setTimeout(() => startRound(newLevel), 1000);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
      setTimeout(() => setGameState("gameover"), 1000);
    }
  }, [gameState, playerInput, currentPuzzle, timer, hintVisible, level, score, startRound]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "playing") return;
      if (e.key === "Enter") handleSubmit();
      else if (e.key === "h" || e.key === "H") showHint();
      else if (e.key === "Backspace") setPlayerInput(p => p.slice(0, -1));
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) setPlayerInput(p => p + e.key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleSubmit, showHint]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickX >= canvas.width / 2 - 80 && clickX <= canvas.width / 2 &&
      clickY >= 260 && clickY <= 295) {
      showHint();
    }
    if (clickX >= canvas.width / 2 + 10 && clickX <= canvas.width / 2 + 90 &&
      clickY >= 260 && clickY <= 295) {
      handleSubmit();
    }
  }, [gameState, showHint, handleSubmit]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Emoji Puzzle</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Level: <span className="text-blue-400 font-bold">{level}</span></span>
        <span className="text-gray-400">High: <span className="text-yellow-400 font-bold">{highScore}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={320}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Guess the phrase from the emoji!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-red-400">Game Over!</p>
              <p className="text-gray-300">Answer: <span className="text-white">{currentPuzzle.answer}</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      {feedback === "correct" && (
        <p className="text-green-400 font-bold text-lg animate-pulse">Correct!</p>
      )}
    </div>
  );
}
