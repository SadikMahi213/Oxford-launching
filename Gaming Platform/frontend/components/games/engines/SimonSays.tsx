"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "showing" | "input" | "gameover";
type Color = "red" | "blue" | "green" | "yellow";

const COLORS: { name: Color; bg: string; active: string; key: string }[] = [
  { name: "red", bg: "bg-red-600", active: "bg-red-400", key: "1" },
  { name: "blue", bg: "bg-blue-600", active: "bg-blue-400", key: "2" },
  { name: "green", bg: "bg-green-600", active: "bg-green-400", key: "3" },
  { name: "yellow", bg: "bg-yellow-500", active: "bg-yellow-300", key: "4" },
];

export default function SimonSays() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerInput, setPlayerInput] = useState<Color[]>([]);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [round, setRound] = useState(0);
  const [speed, setSpeed] = useState(600);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const playSequence = useCallback(
    (seq: Color[]) => {
      clearTimeouts();
      setGameState("showing");
      setActiveColor(null);

      seq.forEach((color, i) => {
        const onTimeout = setTimeout(() => {
          setActiveColor(color);
          const offTimeout = setTimeout(() => setActiveColor(null), speed - 100);
          timeoutsRef.current.push(offTimeout);
        }, i * speed + 200);
        timeoutsRef.current.push(onTimeout);
      });

      const doneTimeout = setTimeout(() => {
        setGameState("input");
        setPlayerInput([]);
      }, seq.length * speed + 500);
      timeoutsRef.current.push(doneTimeout);
    },
    [speed, clearTimeouts]
  );

  const startGame = useCallback(() => {
    clearTimeouts();
    const firstColor = COLORS[Math.floor(Math.random() * 4)].name;
    const newSeq = [firstColor];
    setSequence(newSeq);
    setScore(0);
    setRound(1);
    setSpeed(600);
    setGameState("playing");
    setTimeout(() => playSequence(newSeq), 500);
  }, [clearTimeouts, playSequence]);

  const handleColorPress = useCallback(
    (color: Color) => {
      if (gameState !== "input") return;

      setActiveColor(color);
      setTimeout(() => setActiveColor(null), 200);

      const newInput = [...playerInput, color];
      setPlayerInput(newInput);

      const currentIndex = newInput.length - 1;
      if (newInput[currentIndex] !== sequence[currentIndex]) {
        setGameState("gameover");
        if (score > highScore) setHighScore(score);
        return;
      }

      if (newInput.length === sequence.length) {
        const newScore = score + sequence.length * 10;
        setScore(newScore);
        const newSeq = [...sequence, COLORS[Math.floor(Math.random() * 4)].name];
        setSequence(newSeq);
        setRound((r) => r + 1);
        setSpeed((s) => Math.max(250, s - 20));
        setTimeout(() => playSequence(newSeq), 800);
      }
    },
    [gameState, playerInput, sequence, score, highScore, playSequence]
  );

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle") { startGame(); return; }
      if (gameState === "gameover") { startGame(); return; }
      if (gameState !== "input") return;
      switch (e.key) {
        case "1": case "q": handleColorPress("red"); break;
        case "2": case "w": handleColorPress("blue"); break;
        case "3": case "e": handleColorPress("green"); break;
        case "4": case "r": handleColorPress("yellow"); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, handleColorPress, startGame]);

  const getColorStyle = (color: Color, config: typeof COLORS[0]): string => {
    const isActive = activeColor === color;
    return `${isActive ? config.active : config.bg} ${
      isActive ? "scale-105 brightness-125" : "hover:brightness-110"
    } transition-all duration-100 rounded-2xl flex items-center justify-center text-white font-bold text-lg cursor-pointer select-none`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Simon Says</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Round: <span className="text-white font-bold">{round}</span></span>
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
      </div>

      {highScore > 0 && <p className="text-yellow-400 text-sm">Best: {highScore}</p>}

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm text-center max-w-md">
            Watch the pattern, then repeat it! Keys 1-4 or Q-R to select colors.
          </p>
          <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">Start Game</button>
        </div>
      )}

      {(gameState === "playing" || gameState === "showing" || gameState === "input") && (
        <div className="flex flex-col items-center gap-4">
          <p className={`text-sm font-medium ${
            gameState === "showing" ? "text-yellow-400" : gameState === "input" ? "text-green-400" : "text-gray-400"
          }`}>
            {gameState === "showing" ? "Watch carefully..." : gameState === "input" ? `Your turn! (${playerInput.length}/${sequence.length})` : ""}
          </p>

          <div className="grid grid-cols-2 gap-3 w-64 h-64">
            {COLORS.map((config) => (
              <div
                key={config.name}
                onClick={() => handleColorPress(config.name)}
                className={getColorStyle(config.name, config)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-sm">{config.name}</span>
                  <span className="text-xs opacity-50">[{config.key}]</span>
                </div>
              </div>
            ))}
          </div>

          {gameState === "input" && (
            <div className="flex gap-1">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < playerInput.length
                      ? playerInput[i] === sequence[i]
                        ? "bg-green-400"
                        : "bg-red-400"
                      : "bg-gray-600"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">Wrong!</p>
            <p className="text-gray-400 mt-1">Reached round {round}</p>
            <p className="text-3xl font-bold text-white mt-2">{score}</p>
          </div>
          <button onClick={startGame} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">Play Again</button>
        </div>
      )}
    </div>
  );
}
