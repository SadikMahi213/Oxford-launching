"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getGames,
  toggleGameActive,
  toggleGameFeatured,
  deleteGame,
  type Game,
  type PaginationMeta,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Power,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadGames = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGames(p, 10, q);
      setGames(res.data);
      const pag = (res.meta as Record<string, unknown>)?.pagination as Record<string, unknown> | undefined;
      if (pag) {
        setMeta({
          total: pag.total as number,
          per_page: pag.per_page as number,
          current_page: pag.current_page as number,
          last_page: pag.last_page as number,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load games",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames(page, search);
  }, [page, search, loadGames]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleToggleActive(id: number) {
    setTogglingId(id);
    try {
      const updated = await toggleGameActive(id);
      setGames((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_active: updated.is_active } : g)),
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleFeatured(id: number) {
    setTogglingId(id);
    try {
      const updated = await toggleGameFeatured(id);
      setGames((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, is_featured: updated.is_featured } : g,
        ),
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this game?")) return;
    setDeletingId(id);
    try {
      await deleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Games</h2>
          <p className="text-sm text-zinc-400">Manage all games on the platform.</p>
        </div>
        <Link href="/admin/games/create">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" />
            Add Game
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search games..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border-zinc-700 bg-zinc-800 pl-9 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Search
        </Button>
      </form>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8 text-zinc-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6 text-center text-red-400">
          {error}
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
          No games found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-400">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Difficulty</th>
                  <th className="p-4 font-medium">Plays</th>
                  <th className="p-4 font-medium">Active</th>
                  <th className="p-4 font-medium">Featured</th>
                  <th className="p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr
                    key={game.id}
                    className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30"
                  >
                    <td className="p-4 font-medium">{game.name}</td>
                    <td className="p-4 text-zinc-400">
                      {game.category?.name ?? "—"}
                    </td>
                    <td className="p-4">
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
                    <td className="p-4 text-zinc-400">
                      {game.total_plays.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => void handleToggleActive(game.id)}
                        disabled={togglingId === game.id}
                        className={`rounded p-1.5 transition-colors ${
                          game.is_active
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700"
                        }`}
                        title="Toggle active"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => void handleToggleFeatured(game.id)}
                        disabled={togglingId === game.id}
                        className={`rounded p-1.5 transition-colors ${
                          game.is_featured
                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            : "bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700"
                        }`}
                        title="Toggle featured"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/games/${game.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                          onClick={() => void handleDelete(game.id)}
                          disabled={deletingId === game.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Page {meta.current_page} of {meta.last_page} ({meta.total}{" "}
                games)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() =>
                    setPage((p) => Math.min(meta.last_page, p + 1))
                  }
                  disabled={page === meta.last_page}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
