"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover";

const TRIVIA = [
  { q: "What planet is known as the Red Planet?", a: "Mars", opts: ["Venus", "Mars", "Jupiter", "Saturn"] },
  { q: "What is the largest ocean on Earth?", a: "Pacific", opts: ["Atlantic", "Indian", "Pacific", "Arctic"] },
  { q: "Who painted the Mona Lisa?", a: "Da Vinci", opts: ["Picasso", "Da Vinci", "Monet", "Van Gogh"] },
  { q: "What is the chemical symbol for gold?", a: "Au", opts: ["Ag", "Au", "Go", "Gd"] },
  { q: "How many continents are there?", a: "7", opts: ["5", "6", "7", "8"] },
  { q: "What year did WWII end?", a: "1945", opts: ["1943", "1944", "1945", "1946"] },
  { q: "What is the smallest prime number?", a: "2", opts: ["0", "1", "2", "3"] },
  { q: "Which planet has the most moons?", a: "Saturn", opts: ["Jupiter", "Saturn", "Uranus", "Neptune"] },
  { q: "What is the speed of light in km/s?", a: "300000", opts: ["150000", "300000", "500000", "1000000"] },
  { q: "What gas do plants absorb?", a: "CO2", opts: ["O2", "N2", "CO2", "H2"] },
  { q: "What is the capital of Japan?", a: "Tokyo", opts: ["Seoul", "Tokyo", "Beijing", "Bangkok"] },
  { q: "How many bones are in the human body?", a: "206", opts: ["186", "206", "226", "256"] },
  { q: "What is the hardest natural substance?", a: "Diamond", opts: ["Gold", "Iron", "Diamond", "Quartz"] },
  { q: "Which element has atomic number 1?", a: "Hydrogen", opts: ["Helium", "Hydrogen", "Lithium", "Carbon"] },
  { q: "What is the largest planet?", a: "Jupiter", opts: ["Saturn", "Jupiter", "Neptune", "Uranus"] },
];

export default function TriviaQuiz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timer, setTimer] = useState(15);
  const [questionNum, setQuestionNum] = useState(0);
  const [totalQuestions] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadQuestion = useCallback(() => {
    const idx = questionNum % TRIVIA.length;
    const q = TRIVIA[idx];
    setQuestion(q.q);
    setOptions(q.opts);
    setCorrectAnswer(q.a);
    setSelectedIdx(-1);
    setFeedback(null);
    setTimer(15);
    setGameState("playing");
  }, [questionNum]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Q${questionNum + 1}/${totalQuestions} | Score: ${score} | Time: ${timer}s`, canvas.width / 2, 20);

    if (gameState === "playing") {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      const words = question.split(" ");
      let lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        if (ctx.measureText(currentLine + " " + word).width > canvas.width - 60) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      lines.push(currentLine);

      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, 60 + i * 28);
      });

      const btnW = 200;
      const btnH = 45;
      const gap = 12;
      const startY = 60 + lines.length * 28 + 25;

      options.forEach((opt, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = canvas.width / 2 - btnW - gap / 2 + col * (btnW + gap);
        const y = startY + row * (btnH + gap);

        let bgColor = "#334155";
        let borderColor = "#60A5FA";
        if (selectedIdx === i) {
          bgColor = feedback === "correct" ? "#22C55E" : "#EF4444";
          borderColor = feedback === "correct" ? "#22C55E" : "#EF4444";
        } else if (i === options.indexOf(correctAnswer) && feedback) {
          bgColor = "#22C55E";
          borderColor = "#22C55E";
        }

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 8);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt, x + btnW / 2, y + btnH / 2);
      });

      const timerWidth = 250;
      const timerX = canvas.width / 2 - timerWidth / 2;
      const timerY = canvas.height - 30;
      ctx.fillStyle = "#334155";
      ctx.fillRect(timerX, timerY, timerWidth, 10);
      const ratio = timer / 15;
      ctx.fillStyle = ratio > 0.5 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : "#EF4444";
      ctx.fillRect(timerX, timerY, timerWidth * ratio, 10);
    }
  }, [gameState, score, question, options, correctAnswer, selectedIdx, feedback, timer, questionNum, totalQuestions]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (gameState !== "playing" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setSelectedIdx(-2);
          setFeedback("wrong");
          setHighScore(h => Math.max(h, score));
          setTimeout(() => {
            if (questionNum + 1 >= totalQuestions) {
              setGameState("gameover");
            } else {
              setQuestionNum(n => n + 1);
              loadQuestion();
            }
          }, 1500);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, feedback, questionNum, totalQuestions, score, loadQuestion]);

  const startGame = useCallback(() => {
    setScore(0);
    setQuestionNum(0);
    setGameState("playing");
    const q = TRIVIA[0];
    setQuestion(q.q);
    setOptions(q.opts);
    setCorrectAnswer(q.a);
    setSelectedIdx(-1);
    setFeedback(null);
    setTimer(15);
  }, []);

  const handleOptionClick = useCallback((idx: number) => {
    if (gameState !== "playing" || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedIdx(idx);
    if (options[idx] === correctAnswer) {
      setFeedback("correct");
      setScore(s => s + timer * 10 + 50);
    } else {
      setFeedback("wrong");
      setHighScore(h => Math.max(h, score));
    }

    setTimeout(() => {
      if (questionNum + 1 >= totalQuestions) {
        setGameState("gameover");
      } else {
        setQuestionNum(n => n + 1);
        loadQuestion();
      }
    }, 1500);
  }, [gameState, feedback, options, correctAnswer, timer, score, questionNum, totalQuestions, loadQuestion]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || feedback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const btnW = 200;
    const btnH = 45;
    const gap = 12;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = "bold 18px sans-serif";
    const words = question.split(" ");
    let lineCount = 1;
    let currentLine = "";
    for (const word of words) {
      if (ctx.measureText(currentLine + " " + word).width > canvas.width - 60) {
        lineCount++;
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    const startY = 60 + lineCount * 28 + 25;

    for (let i = 0; i < options.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = canvas.width / 2 - btnW - gap / 2 + col * (btnW + gap);
      const y = startY + row * (btnH + gap);
      if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) {
        handleOptionClick(i);
        break;
      }
    }
  }, [gameState, feedback, options, question, handleOptionClick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === "idle" || gameState === "gameover") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (gameState !== "playing" || feedback) return;
      if (e.key >= "1" && e.key <= "4") handleOptionClick(parseInt(e.key) - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, feedback, startGame, handleOptionClick]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Trivia Quiz</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span></span>
        <span className="text-gray-400">Q: <span className="text-blue-400 font-bold">{questionNum + 1}/{totalQuestions}</span></span>
        <span className="text-gray-400">Time: <span className="text-yellow-400 font-bold">{timer}s</span></span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={350}
          className="rounded-lg border border-gray-700 cursor-pointer max-w-full"
          onClick={handleCanvasClick}
        />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-300 text-sm">Answer {totalQuestions} trivia questions!</p>
              <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">
                Start Game
              </button>
            </div>
          </div>
        )}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-green-400">Quiz Complete!</p>
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
