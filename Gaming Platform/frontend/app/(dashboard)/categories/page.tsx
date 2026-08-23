"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { getGameCategories } from "@/lib/api";
import type { Category } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const categoryIcons: Record<string, string> = {
  puzzle: "🧩",
  strategy: "♟️",
  action: "⚡",
  arcade: "👾",
  card: "🃏",
  math: "🔢",
  word: "📝",
  memory: "🧠",
  board: "🎯",
  dice: "🎲",
  sport: "⚽",
  trivia: "❓",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGameCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Explore games by category.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground">No categories found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/games?category=${cat.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {categoryIcons[cat.slug] ?? cat.icon ?? "🎮"}
                    </span>
                    <div>
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      <CardDescription>
                        {cat.game_count} {cat.game_count === 1 ? "game" : "games"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <LayoutGrid className="h-4 w-4" />
                    Browse games
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
