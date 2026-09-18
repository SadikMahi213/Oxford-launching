"use client";

import Link from "next/link";
import Image from "next/image";

import { Game } from "@/lib/games/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: Game;
  className?: string;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function GameCard({ game, className }: GameCardProps) {
  return (
    <Link href={`/games/${game.slug}`} className={cn("group block", className)}>
      <div className="relative overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={game.thumbnail_url}
            alt={game.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {game.is_featured && (
            <div className="absolute top-2 left-2 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              Featured
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
              {game.name}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                difficultyColors[game.difficulty],
              )}
            >
              {game.difficulty}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {game.description}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {game.category.name}
            </span>
            <span>·</span>
            <span>
              {game.play_count.toLocaleString()} plays
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
