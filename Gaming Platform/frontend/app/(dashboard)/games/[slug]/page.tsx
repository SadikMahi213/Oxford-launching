"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, BarChart3, Tag } from "lucide-react";

import { getGameBySlug, getAllGames } from "@/lib/api";
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
import { GamePlayer } from "@/components/games/GamePlayer";
import { GameCard } from "@/components/games/GameCard";
import { cn } from "@/lib/utils";

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function GamePlayPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [game, setGame] = useState<Game | null>(null);
  const [relatedGames, setRelatedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const gameData = await getGameBySlug(slug);
      setGame(gameData);

      const related = await getAllGames({
        category: gameData.category.slug,
        per_page: 4,
      });
      setRelatedGames(
        related.data.filter((g) => g.id !== gameData.id).slice(0, 3)
      );
    } catch (err) {
      setError("Failed to load game. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-destructive">
          {error ?? "Game not found"}
        </p>
        <Button asChild variant="outline">
          <Link href="/games">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/games">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Games
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <GamePlayer game={game} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{game.name}</CardTitle>
              <CardDescription>{game.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{game.category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    difficultyColors[game.difficulty]
                  )}
                >
                  {game.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {game.play_count.toLocaleString()} plays
                </span>
              </div>
              {game.rules && (
                <div className="pt-2">
                  <h4 className="mb-2 text-sm font-medium">Rules</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {game.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {relatedGames.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Related Games</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
