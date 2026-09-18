"use client";

import { useState, useCallback } from "react";

type GameState = "idle" | "playing" | "gameover";
type Choice = "rock" | "paper" | "scissors";

const CHOICES: { value: Choice; emoji: string; label: string }[] = [
  { value: "rock", emoji: "🪨", label: "Rock" },
  { value: "paper", emoji: "📄", label: "Paper" },
  { value: "scissors", emoji: "✂️", label: "Scissors" },
];

const WINS: Record<Choice, Choice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export default function RockPaperScissors() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [score, setScore] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);
  const [computerWins, setComputerWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [roundsToWin, setRoundsToWin] = useState(5);
  const [history, setHistory] = useState<{ player: Choice; computer: Choice; result: string }[]>([]);

  const startGame = useCallback(() => {
    setScore(0);
    setPlayerWins(0);
    setComputerWins(0);
    setDraws(0);
    setStreak(0);
    setBestStreak(0);
    setRound(0);
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
    setHistory([]);
    setGameState("playing");
  }, []);

  const play = useCallback(
    (choice: Choice) => {
      if (gameState !== "playing") return;

      const computer: Choice = CHOICES[Math.floor(Math.random() * 3)].value;
      setPlayerChoice(choice);
      setComputerChoice(computer);

      let res: "win" | "lose" | "draw";
      if (choice === computer) {
        res = "draw";
        setDraws((d) => d + 1);
        setStreak(0);
      } else if (WINS[choice] === computer) {
        res = "win";
        const newStreak = streak + 1;
        setScore((s) => s + 10 + newStreak * 2);
        setPlayerWins((w) => w + 1);
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
      } else {
        res = "lose";
        setComputerWins((w) => w + 1);
        setStreak(0);
      }

      setResult(res);
      setRound((r) => r + 1);
      setHistory((prev) => [
        ...prev.slice(-9),
        { player: choice, computer, result: res },
      ]);

      if (playerWins + (res === "win" ? 1 : 0) >= roundsToWin) {
        setTimeout(() => setGameState("gameover"), 1500);
      } else if (computerWins + (res === "lose" ? 1 : 0) >= roundsToWin) {
        setTimeout(() => setGameState("gameover"), 1500);
      }
    },
    [gameState, streak, bestStreak, playerWins, computerWins, roundsToWin]
  );

  const getChoiceDisplay = (choice: Choice) => CHOICES.find((c) => c.value === choice)!;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Rock Paper Scissors</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-green-400">Wins: {playerWins}</span>
        <span className="text-red-400">Losses: {computerWins}</span>
        <span className="text-gray-400">Draws: {draws}</span>
        <span className="text-yellow-400">Streak: {streak}</span>
        <span className="text-blue-400">Score: {score}</span>
      </div>

      {gameState === "idle" && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">First to:</span>
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => setRoundsToWin(n)}
                className={`w-10 h-10 rounded font-bold transition ${
                  roundsToWin === n ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 min-h-[140px]">
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-500 text-xs">YOU</p>
              {playerChoice ? (
                <div className="text-6xl">{getChoiceDisplay(playerChoice).emoji}</div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-gray-500">?</div>
              )}
              <p className="text-white font-medium text-sm">{playerChoice ? getChoiceDisplay(playerChoice).label : "—"}</p>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-600">VS</span>
              {result && (
                <span
                  className={`text-lg font-bold mt-2 ${
                    result === "win" ? "text-green-400" : result === "lose" ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  {result === "win" ? "YOU WIN!" : result === "lose" ? "YOU LOSE!" : "DRAW!"}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-500 text-xs">COMPUTER</p>
              {computerChoice ? (
                <div className="text-6xl">{getChoiceDisplay(computerChoice).emoji}</div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-gray-500">?</div>
              )}
              <p className="text-white font-medium text-sm">{computerChoice ? getChoiceDisplay(computerChoice).label : "—"}</p>
            </div>
          </div>

          <div className="flex gap-4">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                onClick={() => play(c.value)}
                className="w-24 h-24 rounded-2xl bg-gray-700 hover:bg-gray-600 flex flex-col items-center justify-center gap-1 transition hover:scale-105 active:scale-95"
              >
                <span className="text-3xl">{c.emoji}</span>
                <span className="text-white text-xs font-medium">{c.label}</span>
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm">First to {roundsToWin} wins!</p>

          {history.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {history.map((h, i) => (
                <span
                  key={i}
                  className={`text-lg px-1 ${
                    h.result === "win" ? "bg-green-900/30 rounded" : h.result === "lose" ? "bg-red-900/30 rounded" : ""
                  }`}
                >
                  {getChoiceDisplay(h.player).emoji}vs{getChoiceDisplay(h.computer).emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 bg-gray-800 rounded-xl text-center">
            <p className={`text-3xl font-bold ${playerWins >= roundsToWin ? "text-green-400" : "text-red-400"}`}>
              {playerWins >= roundsToWin ? "🏆 YOU WIN THE MATCH!" : "😤 COMPUTER WINS!"}
            </p>
            <p className="text-gray-400 mt-2">
              {playerWins} - {computerWins} (Best streak: {bestStreak})
            </p>
            <p className="text-yellow-400 font-bold">Score: {score}</p>
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
