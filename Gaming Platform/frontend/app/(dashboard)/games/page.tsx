"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import { getAllGames, getGameCategories } from "@/lib/api";
import type { Category } from "@/lib/api";
import type { Game } from "@/lib/games/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { GameCard } from "@/components/games/GameCard";

const difficulties = ["all", "easy", "medium", "hard"] as const;

export default function GamesPage() {
  const searchParams = useSearchParams();

  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? "all"
  );
  const [activeDifficulty, setActiveDifficulty] = useState<string>(
    searchParams.get("difficulty") ?? "all"
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1));
  const [totalPages, setTotalPages] = useState(1);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 12 };
      if (activeCategory !== "all") params.category = activeCategory;
      if (activeDifficulty !== "all") params.difficulty = activeDifficulty;
      if (search.trim()) params.search = search.trim();

      const [gamesData, catsData] = await Promise.all([
        getAllGames(params as any),
        getGameCategories(),
      ]);

      setGames(gamesData.data);
      setTotalPages(gamesData.pagination?.last_page ?? 1);
      setCategories(catsData);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, activeDifficulty, search]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadGames();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Games</h1>
        <p className="text-muted-foreground">
          Browse and play from our collection of games.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {difficulties.map((d) => (
              <Button
                key={d}
                variant={activeDifficulty === d ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => {
                  setActiveDifficulty(d);
                  setPage(1);
                }}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveCategory("all");
            setPage(1);
          }}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.slug}
            variant={activeCategory === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveCategory(cat.slug);
              setPage(1);
            }}
          >
            {cat.name}
            <span className="ml-1 text-xs opacity-60">({cat.game_count})</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : games.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
          <p className="text-lg font-medium">No games found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
