"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "finished";

const PARAGRAPHS = [
  "the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs how vexingly quick daft zebras jump",
  "sphinx of black quartz judge my vow two driven jocks help fax my big quiz the five boxing wizards jump quickly",
  "jackdaws love my big sphinx of quartz calzone quick blanching dwarf mashup jinxed golf by the box",
  "crazy frederick bought many very exquisite opal jewels sixty zippers were quickly picked from the woven jute bag",
  "amazingly few discotheques provide jukeboxes my girl wove six dozen plaid jackets before she quit tenacity is key",
  "pack my red box with five dozen liquor jugs dont mess with the zodiac king was the big heart of quartz the jay poached nice plums",
  "two driven jocks help fax my big quiz glum joy pecked squawked and flew ten degrees north the flowery meadows were quite vivid",
];

export default function TypingSpeed() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [timer, setTimer] = useState(60);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    const p = PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)];
    setText(p);
    setTyped("");
    setTimer(60);
    setWpm(0);
    setAccuracy(100);
    setCorrectChars(0);
    setTotalChars(0);
    setGameState("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (gameState === "playing" && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setGameState("finished");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (gameState !== "playing") return;
      const value = e.target.value;
      setTyped(value);
      setTotalChars(value.length);

      let correct = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === text[i]) correct++;
      }
      setCorrectChars(correct);
      setAccuracy(value.length > 0 ? Math.round((correct / value.length) * 100) : 100);

      const elapsed = 60 - timer;
      if (elapsed > 0) {
        const wordsTyped = value.split(" ").filter((w) => w.length > 0).length;
        setWpm(Math.round((wordsTyped / elapsed) * 60));
      }

      if (value.length >= text.length) {
        clearInterval(timerRef.current!);
        const finalWpm = Math.round((text.split(" ").length / 60) * 60);
        setWpm(finalWpm);
        setGameState("finished");
        if (finalWpm > highScore) setHighScore(finalWpm);
      }
    },
    [gameState, text, timer, highScore]
  );

  const getCharClass = (i: number): string => {
    if (i >= typed.length) return "text-gray-500";
    if (typed[i] === text[i]) return "text-green-400";
    return "text-red-400 bg-red-900/30";
  };

  const finalWpm = gameState === "finished" ? wpm : 0;
  const rating = finalWpm >= 80 ? "Speed Demon!" : finalWpm >= 60 ? "Fast Typer!" : finalWpm >= 40 ? "Good Pace" : finalWpm >= 20 ? "Getting There" : "Keep Practicing";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Typing Speed</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">WPM: <span className="text-green-400 font-bold">{wpm}</span></span>
        <span className="text-gray-400">Accuracy: <span className="text-blue-400 font-bold">{accuracy}%</span></span>
        <span className="text-gray-400">Time: <span className="text-red-400 font-bold">{timer}s</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best WPM: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Type the paragraph as fast as you can! You have 60 seconds.
          </p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Typing Test</button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          <div className="w-full p-4 bg-gray-800 rounded-xl font-mono text-lg leading-relaxed tracking-wide min-h-[100px]">
            {text.split("").map((char, i) => (
              <span key={i} className={`${getCharClass(i)} transition-colors`}>
                {char}
              </span>
            ))}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={handleInput}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg font-mono text-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Start typing here..."
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">Characters: <span className="text-white">{typed.length}/{text.length}</span></span>
            <span className="text-gray-400">Correct: <span className="text-green-400">{correctChars}</span></span>
          </div>
        </div>
      )}

      {gameState === "finished" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="p-6 bg-gray-800 rounded-xl text-center w-full">
            <p className="text-4xl font-bold text-white">{wpm}</p>
            <p className="text-gray-400">Words Per Minute</p>
            <p className={`text-xl font-bold mt-2 ${wpm >= 60 ? "text-green-400" : wpm >= 40 ? "text-blue-400" : "text-yellow-400"}`}>{rating}</p>
            <div className="flex justify-around mt-4 pt-4 border-t border-gray-700">
              <div>
                <p className="text-2xl font-bold text-blue-400">{accuracy}%</p>
                <p className="text-gray-500 text-xs">Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{correctChars}</p>
                <p className="text-gray-500 text-xs">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{totalChars - correctChars}</p>
                <p className="text-gray-500 text-xs">Errors</p>
              </div>
            </div>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Try Again</button>
        </div>
      )}
    </div>
  );
}
