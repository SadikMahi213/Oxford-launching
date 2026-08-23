"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

interface CryptogramQuote {
  text: string;
  author: string;
}

const QUOTES: CryptogramQuote[] = [
  { text: "THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO", author: "STEVE JOBS" },
  { text: "INNOVATION DISTINGUISHES BETWEEN A LEADER AND A FOLLOWER", author: "STEVE JOBS" },
  { text: "STAY HUNGRY STAY FOOLISH", author: "STEVE JOBS" },
  { text: "LIFE IS WHAT HAPPENS WHEN YOU ARE BUSY MAKING OTHER PLANS", author: "JOHN LENNON" },
  { text: "THE GREAT GLORY OF LIFE LIVES IN NEVER GIVING UP", author: "CHARLES DICKENS" },
  { text: "IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE", author: "ALBERT EINSTEIN" },
  { text: "THE IMPORTANT THING IS NOT TO STOP QUESTIONING", author: "ALBERT EINSTEIN" },
  { text: "CODE IS LIKE HUMOR WHEN YOU HAVE TO EXPLAIN IT IT IS BAD", author: "GROCKY" },
];

const createCipher = (text: string) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const shuffled = [...letters].sort(() => Math.random() - 0.5);
  const mapping: Record<string, string> = {};
  letters.split("").forEach((l, i) => { mapping[l] = shuffled[i]; });
  return mapping;
};

export default function Cryptogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [quote, setQuote] = useState<CryptogramQuote>({ text: "", author: "" });
  const [cipher, setCipher] = useState<Record<string, string>>({});
  const [playerMapping, setPlayerMapping] = useState<Record<string, string>>({});
  const [selectedLetter, setSelectedLetter] = useState<string>("");
  const [errors, setErrors] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const CELL_W = 22;
  const CELL_H = 28;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !quote.text) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const words = quote.text.split(" ");
    let x = 20;
    let y = 60;

    words.forEach((word) => {
      if (x + word.length * CELL_W > canvas.width - 20) {
        x = 20;
        y += CELL_H * 2 + 10;
      }
      word.split("").forEach((ch) => {
        const decoded = Object.entries(playerMapping).find(([, v]) => v === ch)?.[0] || "?";
        const isSelected = selectedLetter === ch;

        ctx.fillStyle = isSelected ? "#374151" : "#1F2937";
        ctx.fillRect(x, y, CELL_W - 2, CELL_H);
        ctx.strokeStyle = isSelected ? "#3B82F6" : "#4B5563";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL_W - 2, CELL_H);

        ctx.fillStyle = "#EF4444";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(ch, x + CELL_W / 2 - 1, y + 10);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Arial";
        ctx.fillText(decoded, x + CELL_W / 2 - 1, y + 24);

        x += CELL_W;
      });
      x += 12;
    });

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "italic 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`— ${quote.author}`, 20, y + CELL_H * 2 + 20);
  }, [quote, playerMapping, selectedLetter]);

  const startGame = useCallback(() => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const cipherMap = createCipher(q.text);
    setQuote(q);
    setCipher(cipherMap);
    setPlayerMapping({});
    setSelectedLetter("");
    setErrors(0);
    setTimer(0);
    setScore(0);
    setGameState("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== "playing") return;

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      const upperKey = e.key.toUpperCase();
      const decodedLetter = cipher[upperKey];

      if (decodedLetter) {
        const existingEntry = Object.entries(playerMapping).find(([k]) => k === upperKey);
        if (!existingEntry) {
          setPlayerMapping((prev) => ({ ...prev, [upperKey]: decodedLetter }));
        }
      } else {
        setPlayerMapping((prev) => {
          const newMap = { ...prev };
          Object.keys(newMap).forEach((k) => {
            if (newMap[k] === upperKey) delete newMap[k];
          });
          return newMap;
        });
      }
    }

    if (e.key === "Backspace" && selectedLetter) {
      setPlayerMapping((prev) => {
        const newMap = { ...prev };
        delete newMap[selectedLetter];
        return newMap;
      });
      setSelectedLetter("");
    }
  }, [gameState, cipher, playerMapping, selectedLetter]);

  useEffect(() => {
    const uniqueLetters = [...new Set(quote.text.replace(/ /g, ""))];
    const allCorrect = uniqueLetters.every((ch) => {
      const entry = Object.entries(playerMapping).find(([, v]) => v === ch);
      return entry && cipher[entry[0]] === ch;
    });

    if (allCorrect && uniqueLetters.length > 0 && gameState === "playing") {
      const bonus = Math.max(0, 1000 - timer * 5 - errors * 20);
      setScore(1000 + bonus);
      setGameState("gameover");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [playerMapping, quote, cipher, gameState, timer, errors]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleKeyDown]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const usedLetters = Object.keys(playerMapping);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Cryptogram</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Time: {formatTime(timer)}</span>
        <span className="text-red-400">Errors: {errors}</span>
      </div>

      {quote.text && (
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="rounded-lg cursor-pointer bg-gray-900"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * 500;
            const my = ((e.clientY - rect.top) / rect.height) * 180;
            const wordIdx = Math.floor((mx - 20) / (quote.text.length * 12 + 20));
            const charIdx = Math.floor((mx - 20 - wordIdx * 12) / CELL_W);
            if (charIdx >= 0 && charIdx < quote.text.length) {
              const ch = quote.text.replace(/ /g, "")[charIdx];
              if (ch) setSelectedLetter(Object.entries(playerMapping).find(([, v]) => v === ch)?.[0] || "");
            }
          }}
        />
      )}

      {gameState === "playing" && (
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Type a letter to map the cipher. The red letter is encrypted, white is your decode.</p>
          <div className="flex gap-1 flex-wrap justify-center max-w-md">
            {usedLetters.map((k) => (
              <span key={k} className="bg-gray-700 text-white px-2 py-1 rounded text-xs">{k}={playerMapping[k]}</span>
            ))}
          </div>
        </div>
      )}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Decode the encrypted quote by mapping each letter to its correct value.</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">Quote Decoded! 🎉</p>
          <p className="text-white text-sm">Score: {score} | Time: {formatTime(timer)}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">New Quote</button>
        </div>
      )}
    </div>
  );
}
