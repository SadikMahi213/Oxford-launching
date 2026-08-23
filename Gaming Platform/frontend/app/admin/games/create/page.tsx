"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createGame,
  getCategories,
  type Category,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminCreateGamePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]> | null
  >(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category_id: "",
    difficulty: "medium",
    rules: "",
    config: "{}",
    thumbnail_url: "",
    is_active: true,
    is_featured: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cats = await getCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSubmitting(true);

    try {
      let config: Record<string, unknown> = {};
      if (form.config.trim()) {
        try {
          config = JSON.parse(form.config);
        } catch {
          setFieldErrors({ config: ["Invalid JSON"] });
          setSubmitting(false);
          return;
        }
      }

      await createGame({
        name: form.name,
        slug: form.slug,
        description: form.description,
        category_id: Number(form.category_id),
        difficulty: form.difficulty as "easy" | "medium" | "hard",
        rules: form.rules,
        config,
        is_active: form.is_active,
        is_featured: form.is_featured,
        thumbnail_url: form.thumbnail_url || undefined,
      });
      router.push("/admin/games");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.errors);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/games">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Game</h2>
          <p className="text-sm text-zinc-400">Add a new game to the platform.</p>
        </div>
      </div>

      <form
        onSubmit={void handleSubmit}
        className="space-y-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
      >
        {error && (
          <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-zinc-300">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="border-zinc-700 bg-zinc-800 text-zinc-100"
            />
            {fieldErrors?.name && (
              <p className="text-xs text-red-400">{fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug" className="text-zinc-300">
              Slug
            </Label>
            <Input
              id="slug"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              className="border-zinc-700 bg-zinc-800 text-zinc-100"
            />
            {fieldErrors?.slug && (
              <p className="text-xs text-red-400">{fieldErrors.slug[0]}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description" className="text-zinc-300">
            Description
          </Label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category_id" className="text-zinc-300">
              Category
            </Label>
            {loadingCategories ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                className="h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {fieldErrors?.category_id && (
              <p className="text-xs text-red-400">
                {fieldErrors.category_id[0]}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="difficulty" className="text-zinc-300">
              Difficulty
            </Label>
            <select
              id="difficulty"
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rules" className="text-zinc-300">
            Rules
          </Label>
          <textarea
            id="rules"
            name="rules"
            value={form.rules}
            onChange={handleChange}
            rows={4}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Game rules and instructions..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="config" className="text-zinc-300">
            Config (JSON)
          </Label>
          <textarea
            id="config"
            name="config"
            value={form.config}
            onChange={handleChange}
            rows={4}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder='{"key": "value"}'
          />
          {fieldErrors?.config && (
            <p className="text-xs text-red-400">{fieldErrors.config[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="thumbnail_url" className="text-zinc-300">
            Thumbnail URL
          </Label>
          <Input
            id="thumbnail_url"
            name="thumbnail_url"
            value={form.thumbnail_url}
            onChange={handleChange}
            className="border-zinc-700 bg-zinc-800 text-zinc-100"
            placeholder="https://..."
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="is_featured"
              checked={form.is_featured}
              onChange={handleChange}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            Featured
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/games">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {submitting && <Spinner />}
            Create Game
          </Button>
        </div>
      </form>
    </div>
  );
}
