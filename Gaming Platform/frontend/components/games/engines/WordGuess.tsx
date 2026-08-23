"use client";

import { useState, useCallback, useEffect } from "react";

type GameState = "idle" | "playing" | "gameover" | "won";

const WORDS = [
  "JAVASCRIPT", "PYTHON", "TYPESCRIPT", "REACT", "NEXTJS",
  "CANVAS", "GAMING", "KEYBOARD", "MONITOR", "DISPLAY",
  "ALGORITHM", "FUNCTION", "VARIABLE", "COMPILER", "TERMINAL",
  "DATABASE", "NETWORK", "BROWSER", "SERVER", "CLIENT",
  "PROGRAM", "CODING", "DEBUG", "SYNTAX", "OBJECT",
  "ARRAY", "STRING", "NUMBER", "BOOLEAN", "CLASS",
  "DOMAIN", "WIDGET", "PIXEL", "SPRITE", "ENGINE",
  "PHYSICS", "GRAPHICS", "SHADER", "TEXTURE", "VECTOR",
  "BINARY", "KERNEL", "SYSTEM", "MODULE", "IMPORT",
  "RETURN", "LISTEN", " RENDER", " LAYER", "FORMULA",
  "RECURSE", "ITERATE", "ENCODE", "DECODE", "MOBILE",
];

const MAX_WRONG = 7;

export default function WordGuess() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState("");
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const getHint = (w: string): string => {
    const hints: Record<string, string> = {
      JAVASCRIPT: "The language of the web",
      PYTHON: "Named after a snake, used for AI",
      TYPESCRIPT: "JavaScript with types",
      REACT: "Facebook's UI library",
      NEXTJS: "React framework for production",
      CANVAS: "HTML element for drawing",
      GAMING: "What this platform is about",
      ALGORITHM: "Step-by-step problem solving",
      FUNCTION: "A reusable block of code",
      COMPILER: "Translates code to machine language",
      DATABASE: "Where data lives",
      NETWORK: "Computers connected together",
      BROWSER: "Chrome, Firefox, Safari...",
      ALGORITHM2: "A set of rules for solving a problem",
    };
    return hints[w] || "A programming concept";
  };

  const getCategory = (w: string): string => {
    const langs = ["JAVASCRIPT", "PYTHON", "TYPESCRIPT"];
    const web = ["REACT", "NEXTJS", "CANVAS", "BROWSER", "NETWORK"];
    const concepts = ["ALGORITHM", "FUNCTION", "VARIABLE", "COMPILER", "DATABASE", "PROGRAM"];
    if (langs.includes(w)) return "Programming Language";
    if (web.includes(w)) return "Web Development";
    if (concepts.includes(w)) return "Computer Science";
    return "Technology";
  };

  const startGame = useCallback(() => {
    const available = WORDS.filter((w) => !usedWords.has(w));
    const pool = available.length > 0 ? available : WORDS;
    const newWord = pool[Math.floor(Math.random() * pool.length)];
    setWord(newWord);
    setGuessed(new Set());
    setWrongGuesses(0);
    setHint(getHint(newWord));
    setCategory(getCategory(newWord));
    setUsedWords((prev) => new Set(prev).add(newWord));
    setGameState("playing");
  }, [usedWords]);

  const guessLetter = useCallback(
    (letter: string) => {
      if (gameState !== "playing" || guessed.has(letter)) return;

      const newGuessed = new Set(guessed);
      newGuessed.add(letter);
      setGuessed(newGuessed);

      if (!word.includes(letter)) {
        const newWrong = wrongGuesses + 1;
        setWrongGuesses(newWrong);
        if (newWrong >= MAX_WRONG) {
          setGameState("gameover");
          if (score > highScore) setHighScore(score);
        }
      } else {
        const allRevealed = word.split("").every((l) => newGuessed.has(l));
        if (allRevealed) {
          const points = Math.max(100 - wrongGuesses * 15, 10);
          setScore((s) => s + points);
          setGameState("won");
        }
      }
    },
    [gameState, guessed, word, wrongGuesses, score, highScore]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const letter = e.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) guessLetter(letter);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, guessLetter]);

  const drawHangman = (wrong: number) => {
    const parts = [
      <circle key="head" cx="200" cy="70" r="15" stroke="white" strokeWidth="2" fill="none" />,
      <line key="body" x1="200" y1="85" x2="200" y2="140" stroke="white" strokeWidth="2" />,
      <line key="larm" x1="200" y1="100" x2="175" y2="120" stroke="white" strokeWidth="2" />,
      <line key="rarm" x1="200" y1="100" x2="225" y2="120" stroke="white" strokeWidth="2" />,
      <line key="lleg" x1="200" y1="140" x2="180" y2="170" stroke="white" strokeWidth="2" />,
      <line key="rleg" x1="200" y1="140" x2="220" y2="170" stroke="white" strokeWidth="2" />,
      <circle key="eye1" cx="196" cy="68" r="2" fill="white" />,
    ];

    return (
      <svg viewBox="0 0 280 200" className="w-full max-w-xs">
        <line x1="40" y1="190" x2="160" y2="190" stroke="#4B5563" strokeWidth="3" />
        <line x1="80" y1="190" x2="80" y2="30" stroke="#4B5563" strokeWidth="3" />
        <line x1="80" y1="30" x2="200" y2="30" stroke="#4B5563" strokeWidth="3" />
        <line x1="200" y1="30" x2="200" y2="55" stroke="#4B5563" strokeWidth="3" />
        {parts.slice(0, wrong)}
      </svg>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Word Guess</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Wrong: <span className="text-red-400 font-bold">{wrongGuesses}/{MAX_WRONG}</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Guess the word one letter at a time. {MAX_WRONG} wrong guesses and you&apos;re out!
          </p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-4">
          {drawHangman(wrongGuesses)}

          <div className="bg-gray-800/50 px-4 py-2 rounded-lg">
            <p className="text-gray-400 text-xs text-center">Category: {category}</p>
            <p className="text-gray-500 text-xs text-center italic">{hint}</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center max-w-md">
            {word.split("").map((l, i) => (
              <div key={i} className="w-10 h-12 border-b-2 border-gray-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {guessed.has(l) ? l : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 justify-center max-w-md">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <button
                key={letter}
                onClick={() => guessLetter(letter)}
                disabled={guessed.has(letter)}
                className={`w-9 h-9 rounded font-bold text-sm transition ${
                  guessed.has(letter)
                    ? word.includes(letter)
                      ? "bg-green-800 text-green-300"
                      : "bg-red-900/50 text-red-400"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-white text-xl mt-2 tracking-widest font-mono">{word}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}

      {gameState === "won" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-green-400">Correct!</p>
            <p className="text-white text-xl mt-2">{word}</p>
            <p className="text-yellow-400 mt-1">+{Math.max(100 - wrongGuesses * 15, 10)} points</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Next Word</button>
        </div>
      )}
    </div>
  );
}
