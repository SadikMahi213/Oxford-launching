"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardStats,
  type DashboardStats,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Gamepad2,
  Users,
  Play,
  Trophy,
  Plus,
  TrendingUp,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getDashboardStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load stats",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6 text-center text-red-400">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Games",
      value: stats?.total_games ?? 0,
      icon: Gamepad2,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      title: "Total Users",
      value: stats?.total_users ?? 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Plays",
      value: stats?.total_plays ?? 0,
      icon: Play,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Total Scores",
      value: stats?.total_scores ?? 0,
      icon: Trophy,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  const maxCategoryCount = Math.max(
    ...(stats?.games_per_category?.map((c) => c.count) ?? [1]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-zinc-400">
            Overview of your gaming platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/games/create">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              Add Game
            </Button>
          </Link>
          <Link href="/admin/categories/create">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="border-zinc-800 bg-zinc-900"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">{card.title}</p>
                  <p className="mt-1 text-3xl font-bold">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              Games Per Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.games_per_category?.length ? (
              <div className="space-y-3">
                {stats.games_per_category.map((cat) => (
                  <div key={cat.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{cat.category}</span>
                      <span className="text-zinc-500">{cat.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{
                          width: `${(cat.count / maxCategoryCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-5 w-5 text-violet-400" />
              Difficulty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.difficulty_distribution?.length ? (
              <div className="space-y-3">
                {stats.difficulty_distribution.map((d) => {
                  const total =
                    stats.difficulty_distribution.reduce(
                      (s, x) => s + x.count,
                      0,
                    ) || 1;
                  return (
                    <div key={d.difficulty}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="capitalize text-zinc-300">
                          {d.difficulty}
                        </span>
                        <span className="text-zinc-500">{d.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${(d.count / total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-lg">Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_games?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Difficulty</th>
                    <th className="pb-3 font-medium">Plays</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_games.map((game) => (
                    <tr
                      key={game.id}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="py-3 font-medium">{game.name}</td>
                      <td className="py-3 text-zinc-400">
                        {game.category?.name ?? "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            game.difficulty === "easy"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : game.difficulty === "medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {game.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400">
                        {game.total_plays.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            game.is_active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {game.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No games yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
