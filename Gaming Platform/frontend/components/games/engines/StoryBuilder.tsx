"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const STORY_STARTERS = [
  "The wizard cast a spell and",
  "The brave knight",
  "Deep in the forest, a mysterious",
  "The spaceship landed and",
  "On a dark and stormy night, the detective",
  "The magical sword",
  "In the underwater kingdom, the mermaid",
  "The time traveler",
];

const WORD_POOLS = [
  ["found", "discovered", "uncovered", "revealed", "noticed"],
  ["a hidden", "an ancient", "a glowing", "a mysterious", "a powerful"],
  ["treasure", "artifact", "crystal", "scroll", "amulet"],
  ["in the", "beneath the", "behind the", "inside the", "near the"],
  ["abandoned", "enchanted", "forgotten", "hidden", "ancient"],
  ["castle", "temple", "cave", "tower", "palace"],
  ["while", "when", "as", "after", "before"],
  ["a dragon", "a ghost", "a monster", "a stranger", "a king"],
  ["appeared", "arrived", "attacked", "whispered", "laughed"],
];

export default function StoryBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [story, setStory] = useState("");
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [wordsAdded, setWordsAdded] = useState(0);
  const [timer, setTimer] = useState(60);
  const [feedback, setFeedback] = useState<"correct" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateOptions = useCallback(() => {
    const poolIdx = wordsAdded % WORD_POOLS.length;
    const pool = WORD_POOLS[poolIdx];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [wordsAdded]);

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
    ctx.fillText(`Score: ${score} | Words: ${wordsAdded} | Time: ${timer}s`, canvas.width / 2, 25);

    if (gameState === "playing") {
      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Choose the next word to continue the story!", canvas.width / 2, 50);

      const maxWidth = canvas.width - 60;
      const fontSize = 18;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = "#22C55E";

      const words = story.split(" ");
      let lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const startY = 80;
      const lineHeight = 28;
      const maxVisibleLines = 5;
      const visibleLines = lines.slice(-maxVisibleLines);

      visibleLines.forEach((line, i) => {
        ctx.fillStyle = i === visibleLines.length - 1 ? "#22C55E" : "#94A3B8";
        ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
      });

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("+", canvas.width / 2, startY + visibleLines.length * lineHeight + 10);

      const btnW = 150;
      const btnH = 45;
      const gap = 15;
      const totalW = wordOptions.length * (btnW + gap) - gap;
      const btnStartX = canvas.width / 2 - totalW / 2;
      const btnY = 310;

      wordOptions.forEach((opt, i) => {
        const x = btnStartX + i * (btnW + gap);
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(x, btnY, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt, x + btnW / 2, btnY + btnH / 2);
      });

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 30;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 10);
      const ratio = timer / 60;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 10);
    }
  }, [gameState, score, story, wordOptions, wordsAdded, timer]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    const starter = STORY_STARTERS[Math.floor(Math.random() * STORY_STARTERS.length)];
    setStory(starter);
    setScore(0);
    setWordsAdded(0);
    setTimer(60);
    setWordOptions(generateOptions());
    setGameState("playing");
  }, [generateOptions]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setGameState("gameover");
          setHighScore(h => Math.max(h, score));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, score]);

  const handleWordClick = useCallback((word: string) => {
    if (gameState !== "playing") return;

    setStory(s => s + " " + word);
    setWordsAdded(n => n + 1);
    setScore(s => s + 10);

    const newOptions = [];
    for (let i = 0; i < 3; i++) {
      const poolIdx = (wordsAdded + 1 + i) % WORD_POOLS.length;
      const pool = WORD_POOLS[poolIdx];
      newOptions.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    setWordOptions(newOptions);
  }, [gameState, wordsAdded]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const btnW = 150;
    const btnH = 45;
    const gap = 15;
    const totalW = wordOptions.length * (btnW + gap) - gap;
    const btnStartX = canvas.width / 2 - totalW / 2;
    const btnY = 310;

    wordOptions.forEach((opt, i) => {
      const x = btnStartX + i * (btnW + gap);
      if (clickX >= x && clickX <= x + btnW && clickY >= btnY && clickY <= btnY + btnH) {
        handleWordClick(opt);
      }
    });
  }, [gameState, wordOptions, handleWordClick]);

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
      if (e.key >= "1" && e.key <= "3") handleWordClick(wordOptions[parseInt(e.key) - 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, handleWordClick, wordOptions]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Story Builder</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Words: <span className="text-blue-400 font-bold">{wordsAdded}</span></span>
        <span className="text-gray-400">Time: <span className="text-yellow-400 font-bold">{timer}s</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={560}
          height={400}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Build a story by choosing words! Each word = 10 pts.</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-green-400">Story Complete!</p>
              <p className="text-3xl font-bold text-white">{score} pts</p>
              <p className="text-gray-300 text-sm max-w-md text-center px-4">&quot;{story}&quot;</p>
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
