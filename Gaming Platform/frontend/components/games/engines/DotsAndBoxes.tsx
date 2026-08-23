"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type GameState = "idle" | "playing" | "gameover";

const GRID = 5;
const CELL = 60;
const DOT_RADIUS = 4;

type Player = "red" | "blue";

interface Edge {
  horizontal: boolean;
  ownedBy: Player | null;
}

const createEdges = (): Edge[][][] => {
  const hEdges: Edge[][] = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID - 1 }, () => ({ horizontal: true, ownedBy: null }))
  );
  const vEdges: Edge[][] = Array.from({ length: GRID - 1 }, () =>
    Array.from({ length: GRID }, () => ({ horizontal: false, ownedBy: null }))
  );
  return [hEdges, vEdges];
};

const countBoxes = (hEdges: Edge[][], vEdges: Edge[][]): { red: number; blue: number } => {
  let red = 0, blue = 0;
  for (let r = 0; r < GRID - 1; r++) {
    for (let c = 0; c < GRID - 1; c++) {
      const top = hEdges[r][c].ownedBy;
      const bottom = hEdges[r + 1][c].ownedBy;
      const left = vEdges[r][c].ownedBy;
      const right = vEdges[r][c + 1].ownedBy;
      if (top && bottom && left && right) {
        if (top === "red" || bottom === "red" || left === "red" || right === "red") red++;
        else blue++;
      }
    }
  }
  return { red, blue };
};

const isComplete = (hEdges: Edge[][], vEdges: Edge[][]): boolean => {
  return hEdges.every((row) => row.every((e) => e.ownedBy !== null)) &&
    vEdges.every((row) => row.every((e) => e.ownedBy !== null));
};

const checkNewBox = (hEdges: Edge[][], vEdges: Edge[][], row: number, col: number, horizontal: boolean): boolean => {
  if (horizontal) {
    if (row > 0) {
      const top = hEdges[row - 1][col].ownedBy;
      const left = vEdges[row - 1][col].ownedBy;
      const right = vEdges[row - 1][col + 1].ownedBy;
      if (top && left && right) return true;
    }
    if (row < GRID - 1) {
      const bottom = hEdges[row + 1][col].ownedBy;
      const left = vEdges[row][col].ownedBy;
      const right = vEdges[row][col + 1].ownedBy;
      if (bottom && left && right) return true;
    }
  } else {
    if (col > 0) {
      const top = hEdges[row][col - 1].ownedBy;
      const bottom = hEdges[row + 1][col - 1].ownedBy;
      const left = vEdges[row][col - 1].ownedBy;
      if (top && bottom && left) return true;
    }
    if (col < GRID - 1) {
      const top = hEdges[row][col].ownedBy;
      const bottom = hEdges[row + 1][col].ownedBy;
      const right = vEdges[row][col + 1].ownedBy;
      if (top && bottom && right) return true;
    }
  }
  return false;
};

export default function DotsAndBoxes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [hEdges, setHEdges] = useState<Edge[][]>([]);
  const [vEdges, setVEdges] = useState<Edge[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("red");
  const [message, setMessage] = useState("");
  const [hoverEdge, setHoverEdge] = useState<{ type: "h" | "v"; row: number; col: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || hEdges.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = 30;
    const oy = 30;

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        ctx.fillStyle = "#6B7280";
        ctx.beginPath();
        ctx.arc(ox + c * CELL, oy + r * CELL, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    hEdges.forEach((row, r) => {
      row.forEach((edge, c) => {
        const x1 = ox + c * CELL;
        const y1 = oy + r * CELL;
        const x2 = ox + (c + 1) * CELL;

        ctx.lineWidth = 4;
        if (edge.ownedBy) {
          ctx.strokeStyle = edge.ownedBy === "red" ? "#EF4444" : "#3B82F6";
        } else if (hoverEdge && hoverEdge.type === "h" && hoverEdge.row === r && hoverEdge.col === c) {
          ctx.strokeStyle = currentPlayer === "red" ? "#FCA5A5" : "#93C5FD";
        } else {
          ctx.strokeStyle = "#374151";
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.stroke();
      });
    });

    vEdges.forEach((row, r) => {
      row.forEach((edge, c) => {
        const x1 = ox + c * CELL;
        const y1 = oy + r * CELL;
        const y2 = oy + (r + 1) * CELL;

        ctx.lineWidth = 4;
        if (edge.ownedBy) {
          ctx.strokeStyle = edge.ownedBy === "red" ? "#EF4444" : "#3B82F6";
        } else if (hoverEdge && hoverEdge.type === "v" && hoverEdge.row === r && hoverEdge.col === c) {
          ctx.strokeStyle = currentPlayer === "red" ? "#FCA5A5" : "#93C5FD";
        } else {
          ctx.strokeStyle = "#374151";
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, y2);
        ctx.stroke();
      });
    });

    for (let r = 0; r < GRID - 1; r++) {
      for (let c = 0; c < GRID - 1; c++) {
        const top = hEdges[r][c].ownedBy;
        const bottom = hEdges[r + 1][c].ownedBy;
        const left = vEdges[r][c].ownedBy;
        const right = vEdges[r][c + 1].ownedBy;
        if (top && bottom && left && right) {
          const x = ox + c * CELL + CELL / 2;
          const y = oy + r * CELL + CELL / 2;
          ctx.fillStyle = top === "red" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)";
          ctx.fillRect(ox + c * CELL + 4, oy + r * CELL + 4, CELL - 8, CELL - 8);
        }
      }
    }

    const counts = countBoxes(hEdges, vEdges);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Red: ${counts.red} | Blue: ${counts.blue} | Turn: ${currentPlayer}`, canvas.width / 2, canvas.height - 10);
  }, [hEdges, vEdges, currentPlayer, hoverEdge]);

  const startGame = useCallback(() => {
    const [h, v] = createEdges();
    setHEdges(h);
    setVEdges(v);
    setCurrentPlayer("red");
    setMessage("Red's turn");
    setScore(0);
    setGameState("playing");
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas || hEdges.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ox = 30;
    const oy = 30;

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID - 1; c++) {
        const x1 = ox + c * CELL;
        const x2 = ox + (c + 1) * CELL;
        const y = oy + r * CELL;
        if (my >= y - 10 && my <= y + 10 && mx >= x1 && mx <= x2 && !hEdges[r][c].ownedBy) {
          const newHEdges = hEdges.map((row) => row.map((e) => ({ ...e })));
          newHEdges[r][c].ownedBy = currentPlayer;
          setHEdges(newHEdges);

          if (checkNewBox(newHEdges, vEdges, r, c, true)) {
            setMessage(`Player ${currentPlayer} scores!`);
          } else {
            setCurrentPlayer(currentPlayer === "red" ? "blue" : "red");
          }
          return;
        }
      }
    }

    for (let r = 0; r < GRID - 1; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = ox + c * CELL;
        const y1 = oy + r * CELL;
        const y2 = oy + (r + 1) * CELL;
        if (mx >= x - 10 && mx <= x + 10 && my >= y1 && my <= y2 && !vEdges[r][c].ownedBy) {
          const newVEdges = vEdges.map((row) => row.map((e) => ({ ...e })));
          newVEdges[r][c].ownedBy = currentPlayer;
          setVEdges(newVEdges);

          if (checkNewBox(hEdges, newVEdges, r, c, false)) {
            setMessage(`Player ${currentPlayer} scores!`);
          } else {
            setCurrentPlayer(currentPlayer === "red" ? "blue" : "red");
          }
          return;
        }
      }
    }
  }, [gameState, hEdges, vEdges, currentPlayer]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || hEdges.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ox = 30;
    const oy = 30;

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID - 1; c++) {
        const x1 = ox + c * CELL;
        const x2 = ox + (c + 1) * CELL;
        const y = oy + r * CELL;
        if (my >= y - 10 && my <= y + 10 && mx >= x1 && mx <= x2) {
          setHoverEdge({ type: "h", row: r, col: c });
          return;
        }
      }
    }

    for (let r = 0; r < GRID - 1; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = ox + c * CELL;
        const y1 = oy + r * CELL;
        const y2 = oy + (r + 1) * CELL;
        if (mx >= x - 10 && mx <= x + 10 && my >= y1 && my <= y2) {
          setHoverEdge({ type: "v", row: r, col: c });
          return;
        }
      }
    }

    setHoverEdge(null);
  }, [hEdges]);

  useEffect(() => {
    if (hEdges.length > 0 && isComplete(hEdges, vEdges)) {
      const counts = countBoxes(hEdges, vEdges);
      setScore(Math.max(counts.red, counts.blue));
      setMessage(counts.red > counts.blue ? "Red wins!" : counts.blue > counts.red ? "Blue wins!" : "Draw!");
      setGameState("gameover");
    }
  }, [hEdges, vEdges]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-[500px]">
      <h2 className="text-xl font-bold text-white">Dots and Boxes</h2>
      <div className="flex gap-4 text-sm">
        <span className="text-red-400">Red: {hEdges.length > 0 ? countBoxes(hEdges, vEdges).red : 0}</span>
        <span className="text-blue-400">Blue: {hEdges.length > 0 ? countBoxes(hEdges, vEdges).blue : 0}</span>
        <span className="text-gray-400">Turn: {currentPlayer}</span>
      </div>

      {hEdges.length > 0 && (
        <canvas
          ref={canvasRef}
          width={(GRID - 1) * CELL + 60}
          height={(GRID - 1) * CELL + 60}
          className="rounded-lg cursor-pointer"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverEdge(null)}
        />
      )}

      {message && <p className="text-gray-300 text-sm">{message}</p>}

      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-gray-300 mb-3">Draw lines between dots to complete boxes. Complete a box to go again!</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold text-lg">Start Game</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="text-center">
          <p className="text-green-400 text-lg font-bold">{message}</p>
          <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded mt-2">Play Again</button>
        </div>
      )}
    </div>
  );
}
