"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const TEXTS = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "the five boxing wizards jump quickly",
  "sphinx of black quartz judge my vow",
  "two driven jabs help quick the fox",
  "linchpins of freeware buzz down jet",
  "crux of the problem master both vq",
  "woven silk pyjamas exchanged for blue quartz",
  "bright vixens jump dozy fowl quack",
];

export default function TypingTutor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
    ctx.fillText(`WPM: ${wpm} | Accuracy: ${accuracy}% | Errors: ${errors}`, canvas.width / 2, 25);

    if (gameState === "playing" && text) {
      const fontSize = 22;
      ctx.font = `${fontSize}px monospace`;
      const maxWidth = canvas.width - 60;
      const words = text.split(" ");
      const lines: string[][] = [[]];
      let currentLine = 0;
      let lineWidth = 0;

      for (const word of words) {
        const wordWidth = ctx.measureText(word + " ").width;
        if (lineWidth + wordWidth > maxWidth) {
          lines.push([]);
          currentLine++;
          lineWidth = 0;
        }
        lines[currentLine].push(word);
        lineWidth += wordWidth;
      }

      const startY = 60;
      const lineHeight = 35;

      lines.forEach((line, lineIdx) => {
        let xPos = 30;
        for (const word of line) {
          for (let i = 0; i < word.length; i++) {
            const charIdx = text.indexOf(word) + i;
            const char = word[i];

            if (charIdx < typed.length) {
              if (typed[charIdx] === char) {
                ctx.fillStyle = "#22C55E";
              } else {
                ctx.fillStyle = "#EF4444";
              }
            } else if (charIdx === typed.length) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(xPos - 1, startY + lineIdx * lineHeight + 5, ctx.measureText(char).width + 2, fontSize + 4);
              ctx.fillStyle = "#0F172A";
            } else {
              ctx.fillStyle = "#64748B";
            }

            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(char, xPos, startY + lineIdx * lineHeight);
            xPos += ctx.measureText(char).width;
          }
          xPos += ctx.measureText(" ").width;
        }
      });

      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Time: ${elapsed}s | Level: ${level} | Score: ${score}`, canvas.width / 2, canvas.height - 20);
    }
  }, [gameState, text, typed, errors, wpm, accuracy, elapsed, level, score]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    const lvlText = TEXTS[Math.min(level - 1, TEXTS.length - 1)];
    setText(lvlText);
    setTyped("");
    setErrors(0);
    setWpm(0);
    setAccuracy(100);
    setScore(0);
    setElapsed(0);
    setStartTime(Date.now());
    setGameState("playing");
  }, [level]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
      if (startTime > 0) {
        const minutes = (Date.now() - startTime) / 60000;
        const words = typed.length / 5;
        setWpm(minutes > 0 ? Math.round(words / minutes) : 0);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, startTime, typed.length]);

  useEffect(() => {
    if (typed.length === text.length && text.length > 0 && gameState === "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      const finalWpm = wpm;
      const pts = Math.round(finalWpm * accuracy / 10) * 10 + level * 50;
      setScore(pts);
      if (pts > highScore) setHighScore(pts);
      setGameState("gameover");
    }
  }, [typed, text, gameState, wpm, accuracy, level, highScore]);

  useEffect(() => {
    if (typed.length > 0) {
      let correct = 0;
      for (let i = 0; i < typed.length; i++) {
        if (typed[i] === text[i]) correct++;
      }
      setAccuracy(Math.round((correct / typed.length) * 100));
    }
  }, [typed, text]);

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

      if (e.key === "Backspace") {
        setTyped(t => t.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (typed.length < text.length) {
          if (e.key !== text[typed.length]) {
            setErrors(err => err + 1);
          }
          setTyped(t => t + e.key);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, typed, text, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Typing Tutor</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">WPM: <span className="text-green-400 font-bold">{wpm}</span></span>
        <span className="text-gray-400">Accuracy: <span className="text-blue-400 font-bold">{accuracy}%</span></span>
        <span className="text-gray-400">Score: <span className="text-yellow-400 font-bold">{score}</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={700}
          height={250}
          className="rounded-lg border border-gray-700 max-w-full"
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Type the text as fast and accurately as you can!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-green-400">Complete!</p>
              <p className="text-gray-300">WPM: <span className="text-white font-bold">{wpm}</span> | Accuracy: <span className="text-white font-bold">{accuracy}%</span></p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
