"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Medal, TrendingUp } from "lucide-react";

import {
  getLeaderboard,
  getScoreHistory,
  getAllGames,
} from "@/lib/api";
import type { LeaderboardEntry, ScoreHistoryEntry } from "@/lib/api";
import type { Game } from "@/lib/games/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const periods = [
  { value: "all_time", label: "All Time" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
];

const rankStyles: Record<number, string> = {
  1: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  2: "bg-gray-300/10 text-gray-500 border-gray-400/30",
  3: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"global" | "history" | "game">("global");
  const [period, setPeriod] = useState("all_time");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (selectedGame) params.game_slug = selectedGame;
      const data = await getLeaderboard(params);
      setLeaderboard(data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [period, selectedGame]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScoreHistory({ per_page: 50 });
      setHistory(data.data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGames = useCallback(async () => {
    try {
      const data = await getAllGames({ per_page: 100 });
      setGames(data.data);
    } catch {
      // Failed to load
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (activeTab === "global" || activeTab === "game") {
      loadLeaderboard();
    } else if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadLeaderboard, loadHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against other players.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["global", "history", "game"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab === "global" && <Trophy className="mr-1 h-4 w-4" />}
            {tab === "history" && <TrendingUp className="mr-1 h-4 w-4" />}
            {tab === "game" && <Medal className="mr-1 h-4 w-4" />}
            {tab === "global" ? "Global" : tab === "history" ? "My Scores" : "By Game"}
          </Button>
        ))}
      </div>

      {(activeTab === "global" || activeTab === "game") && (
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}

          {activeTab === "game" && (
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="ml-2 rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : activeTab === "history" ? (
        <Card>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <p className="text-muted-foreground">No game history yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.game_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.played_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : leaderboard.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-muted-foreground">No leaderboard data available.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={cn(
                    "flex items-center gap-4 border-l-4 p-4",
                    rankStyles[entry.rank] ?? "border-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      rankStyles[entry.rank] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {entry.rank}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{entry.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.games_played} games played
                    </p>
                  </div>
                  <span className="text-lg font-bold">
                    {entry.total_score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
