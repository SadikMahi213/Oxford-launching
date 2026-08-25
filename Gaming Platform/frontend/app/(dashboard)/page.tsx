"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Coins,
  Gift,
  Trophy,
  Play,
  ArrowRight,
  Gamepad2,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  getDemoCredits,
  claimDailyBonus,
  getFeaturedGames,
  getLeaderboard,
  getUserStats,
} from "@/lib/api";
import type { DemoCredits, LeaderboardEntry, UserStats } from "@/lib/api";
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
import { GameCard } from "@/components/games/GameCard";

export default function HomePage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<DemoCredits | null>(null);
  const [featured, setFeatured] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [creditsData, featuredData, leaderboardData, statsData] =
        await Promise.allSettled([
          getDemoCredits(),
          getFeaturedGames(),
          getLeaderboard({ period: "all_time" }),
          getUserStats(),
        ]);

      if (creditsData.status === "fulfilled") setCredits(creditsData.value);
      if (featuredData.status === "fulfilled") setFeatured(featuredData.value);
      if (leaderboardData.status === "fulfilled")
        setLeaderboard(leaderboardData.value);
      if (statsData.status === "fulfilled") setStats(statsData.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaimBonus = async () => {
    setClaiming(true);
    try {
      const result = await claimDailyBonus();
      setCredits((prev) =>
        prev
          ? { ...prev, balance: result.new_balance, can_claim_daily: false }
          : prev
      );
    } catch {
      // Bonus claim failed
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {user?.name ?? "Player"}!
        </h1>
        <p className="text-muted-foreground">
          Ready to play? Check out today&apos;s challenges.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10">
              <Coins className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Demo Credits</p>
              <p className="text-3xl font-bold">
                {credits?.balance.toLocaleString() ?? "---"}
              </p>
            </div>
            <Button
              onClick={handleClaimBonus}
              disabled={claiming || !credits?.can_claim_daily}
              size="lg"
            >
              {claiming ? (
                <Spinner />
              ) : (
                <Gift className="h-5 w-5 mr-2" />
              )}
              {credits?.can_claim_daily ? "Daily Bonus" : "Claimed"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Games Played</p>
                <p className="text-xl font-bold">
                  {stats?.total_games_played ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-xl font-bold">
                  {(stats?.total_score ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Featured Games</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/games">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Players
              </CardTitle>
              <CardDescription>Global leaderboard rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((entry) => (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        entry.rank === 1
                          ? "bg-yellow-500/10 text-yellow-600"
                          : entry.rank === 2
                            ? "bg-gray-300/20 text-gray-500"
                            : entry.rank === 3
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.games_played} games
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {entry.total_score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href="/leaderboard">
                  Full Leaderboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Quick Play</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "All Games", href: "/games", color: "bg-primary/10 text-primary" },
            { label: "Easy Games", href: "/games?difficulty=easy", color: "bg-green-500/10 text-green-600" },
            { label: "Hard Games", href: "/games?difficulty=hard", color: "bg-red-500/10 text-red-600" },
            { label: "Categories", href: "/categories", color: "bg-purple-500/10 text-purple-600" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}
                >
                  <Play className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
