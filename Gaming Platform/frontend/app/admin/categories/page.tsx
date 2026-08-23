"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getCategories,
  deleteCategory,
  type Category,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setDeletingId(id);
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
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
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-zinc-400">
            Manage game categories.
          </p>
        </div>
        <Link href="/admin/categories/create">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8 text-zinc-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6 text-center text-red-400">
          {error}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
          No categories found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-400">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Games</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30"
                >
                  <td className="p-4 font-medium">{cat.name}</td>
                  <td className="p-4 font-mono text-xs text-zinc-400">
                    {cat.slug}
                  </td>
                  <td className="max-w-xs truncate p-4 text-zinc-400">
                    {cat.description || "—"}
                  </td>
                  <td className="p-4 text-zinc-400">
                    {cat.games_count ?? 0}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/categories/${cat.id}/edit`}>
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
                        onClick={() => void handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
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
      )}
    </div>
  );
}
