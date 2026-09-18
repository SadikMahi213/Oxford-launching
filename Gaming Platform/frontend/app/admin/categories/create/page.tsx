"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCategory } from "@/lib/admin-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";

export default function AdminCreateCategoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]> | null
  >(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSubmitting(true);

    try {
      await createCategory(form);
      router.push("/admin/categories");
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
        <Link href="/admin/categories">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Category</h2>
          <p className="text-sm text-zinc-400">Add a new game category.</p>
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
              placeholder="Puzzle Games"
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
              placeholder="puzzle-games"
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
            placeholder="A brief description of this category..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="icon" className="text-zinc-300">
            Icon
          </Label>
          <Input
            id="icon"
            name="icon"
            value={form.icon}
            onChange={handleChange}
            className="border-zinc-700 bg-zinc-800 text-zinc-100"
            placeholder="puzzle, brain, etc."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/categories">
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
            Create Category
          </Button>
        </div>
      </form>
    </div>
  );
}
