"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "placing" | "playing" | "gameover";

const GRID_SIZE = 10;
const CELL = 32;

type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

interface Ship {
  name: string;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
  sunk: boolean;
}

const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

const createEmptyGrid = (): CellState[][] =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("empty"));

const placeShipsRandomly = (ships: { name: string; size: number }[]): Ship[] => {
  const grid = createEmptyGrid();
  const placedShips: Ship[] = [];

  for (const shipDef of ships) {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const positions: { row: number; col: number }[] = [];
      let fits = true;

      for (let i = 0; i < shipDef.size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= GRID_SIZE || c >= GRID_SIZE || grid[r][c] !== "empty") {
          fits = false;
          break;
        }
        positions.push({ row: r, col: c });
      }

      if (fits) {
        positions.forEach((p) => { grid[p.row][p.col] = "ship"; });
        placedShips.push({ name: shipDef.name, size: shipDef.size, positions, hits: 0, sunk: false });
        placed = true;
      }
    }
  }

  return placedShips;
};

export default function Battleship() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [playerGrid, setPlayerGrid] = useState<CellState[][]>(createEmptyGrid());
  const [enemyGrid, setEnemyGrid] = useState<CellState[][]>(createEmptyGrid());
  const [enemyShips, setEnemyShips] = useState<Ship[]>([]);
  const [playerShips, setPlayerShips] = useState<Ship[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [message, setMessage] = useState("");
  const [shotsFired, setShotsFired] = useState(0);
  const [playerShots, setPlayerShots] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawGrid = (grid: CellState[][], offsetX: number, label: string, showShips: boolean) => {
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, offsetX + GRID_SIZE * CELL / 2, 15);

      for (let r = 0; r < GRID_SIZE; r++) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.fillText(String(r + 1), offsetX - 5, r * CELL + CELL / 2 + 4);

        for (let c = 0; c < GRID_SIZE; c++) {
          const x = offsetX + c * CELL;
          const y = 25 + r * CELL;
          const cell = grid[r][c];

          if (cell === "hit") ctx.fillStyle = "#EF4444";
          else if (cell === "miss") ctx.fillStyle = "#6B7280";
          else if (cell === "sunk") ctx.fillStyle = "#991B1B";
          else if (cell === "ship" && showShips) ctx.fillStyle = "#374151";
          else ctx.fillStyle = "#1E3A5F";

          ctx.fillRect(x, y, CELL - 1, CELL - 1);

          if (cell === "hit") {
            ctx.fillStyle = "#fff";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("×", x + CELL / 2, y + CELL / 2 + 1);
          }
          if (cell === "miss") {
            ctx.fillStyle = "#fff";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("•", x + CELL / 2, y + CELL / 2 + 1);
          }
        }
      }

      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(String.fromCharCode(65 + c), offsetX + c * CELL + CELL / 2, GRID_SIZE * CELL + 38);
      }
    };

    drawGrid(playerGrid, 20, "YOUR WATERS", true);
    drawGrid(enemyGrid, GRID_SIZE * CELL + 60, "ENEMY WATERS", false);
  }, [playerGrid, enemyGrid]);

  const startGame = useCallback(() => {
    setPlayerGrid(createEmptyGrid());
    setEnemyGrid(createEmptyGrid());
    setEnemyShips(placeShipsRandomly(SHIPS));
    setPlayerShips(placeShipsRandomly(SHIPS));
    setTurn("player");
    setMessage("Your turn! Click on enemy waters to fire.");
    setShotsFired(0);
    setPlayerShots(0);
    setScore(0);
    setGameState("playing");
  }, []);

  const playerFire = useCallback((row: number, col: number) => {
    if (gameState !== "playing" || turn !== "player") return;
    if (enemyGrid[row][col] === "hit" || enemyGrid[row][col] === "miss" || enemyGrid[row][col] === "sunk") return;

    const newGrid = enemyGrid.map((r) => [...r]);
    let hit = false;

    for (const ship of enemyShips) {
      if (ship.sunk) continue;
      const pos = ship.positions.find((p) => p.row === row && p.col === col);
      if (pos) {
        ship.hits++;
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          ship.positions.forEach((p) => { newGrid[p.row][p.col] = "sunk"; });
          setMessage(`You sunk the ${ship.name}!`);
        } else {
          newGrid[row][col] = "hit";
          setMessage("Hit!");
        }
        hit = true;
        break;
      }
    }

    if (!hit) {
      newGrid[row][col] = "miss";
      setMessage("Miss!");
    }

    setEnemyGrid(newGrid);
    setPlayerShots((s) => s + 1);

    if (enemyShips.every((s) => s.sunk)) {
      const pts = Math.max(100, 1000 - playerShots * 10);
      setScore(pts);
      setMessage("You win! All enemy ships sunk!");
      setGameState("gameover");
      return;
    }

    setTurn("enemy");
  }, [gameState, turn, enemyGrid, enemyShips, playerShots]);

  const enemyFire = useCallback(() => {
    if (gameState !== "playing" || turn !== "enemy") return;

    const newGrid = playerGrid.map((r) => [...r]);
    let row: number, col: number;
    let attempts = 0;

    do {
      row = Math.floor(Math.random() * GRID_SIZE);
      col = Math.floor(Math.random() * GRID_SIZE);
      attempts++;
    } while ((newGrid[row][col] === "hit" || newGrid[row][col] === "miss" || newGrid[row][col] === "sunk") && attempts < 200);

    let hit = false;
    for (const ship of playerShips) {
      if (ship.sunk) continue;
      const pos = ship.positions.find((p) => p.row === row && p.col === col);
      if (pos) {
        ship.hits++;
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          ship.positions.forEach((p) => { newGrid[p.row][p.col] = "sunk"; });
        } else {
          newGrid[row][col] = "hit";
        }
        hit = true;
        break;
      }
    }

    if (!hit) newGrid[row][col] = "miss";

    setPlayerGrid(newGrid);
    setShotsFired((s) => s + 1);

    if (playerShips.every((s) => s.sunk)) {
      setMessage("You lose! All your ships are sunk!");
      setGameState("gameover");
      return;
    }

    setTurn("player");
  }, [gameState, turn, playerGrid, playerShips]);

  useEffect(() => {
    if (turn === "enemy" && gameState === "playing") {
      const timeout = setTimeout(enemyFire, 800);
      return () => clearTimeout(timeout);
    }
  }, [turn, enemyFire, gameState]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Battleship</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-yellow-400">Score: {score}</span>
        <span className="text-gray-400">Your Shots: {playerShots}</span>
        <span className="text-blue-400">Turn: {turn === "player" ? "Your Turn" : "Enemy Turn"}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL * 2 + 80}
        height={GRID_SIZE * CELL + 50}
        className="rounded-lg cursor-pointer"
        onClick={(e) => {
          if (gameState !== "playing" || turn !== "player") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * (GRID_SIZE * CELL * 2 + 80);
          const my = ((e.clientY - rect.top) / rect.height) * (GRID_SIZE * CELL + 50);

          const enemyOffsetX = GRID_SIZE * CELL + 60;
          if (mx >= enemyOffsetX && mx < enemyOffsetX + GRID_SIZE * CELL && my >= 25) {
            const col = Math.floor((mx - enemyOffsetX) / CELL);
            const row = Math.floor((my - 25) / CELL);
            if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
              playerFire(row, col);
            }
          }
        }}
      />

      <p className="text-gray-400 text-sm">{message}</p>

      <div className="flex gap-2 text-xs">
        {SHIPS.map((s) => {
          const enemyShip = enemyShips.find((es) => es.name === s.name);
          return (
            <span key={s.name} className={enemyShip?.sunk ? "text-red-400 line-through" : "text-gray-300"}>
              {s.name} ({s.size})
            </span>
          );
        })}
      </div>

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Click on enemy waters (right grid) to fire. Sink all 5 ships to win!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Battle</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className={`text-lg font-bold ${message.includes("win") ? "text-green-400" : "text-red-400"}`}>{message}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">New Game</button>
        </div>
      )}
    </div>
  );
}
