import { apiFetch, apiFetchEnvelope } from "./api/client";
import type { ApiEnvelope } from "./api/types";

export interface Game {
  id: number;
  name: string;
  slug: string;
  description: string;
  category_id: number;
  category?: Category;
  difficulty: "easy" | "medium" | "hard";
  rules: string;
  config: Record<string, unknown>;
  is_active: boolean;
  is_featured: boolean;
  thumbnail_url: string | null;
  total_plays: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  games_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_games: number;
  total_users: number;
  total_plays: number;
  total_scores: number;
  recent_games: Game[];
  games_per_category: { category: string; count: number }[];
  difficulty_distribution: { difficulty: string; count: number }[];
}

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CreateGamePayload {
  name: string;
  slug: string;
  description: string;
  category_id: number;
  difficulty: "easy" | "medium" | "hard";
  rules: string;
  config: Record<string, unknown>;
  is_active?: boolean;
  is_featured?: boolean;
  thumbnail_url?: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/admin/stats");
}

export async function getGames(
  page = 1,
  perPage = 10,
  search = "",
): Promise<ApiEnvelope<Game[]>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search) params.set("search", search);
  return apiFetchEnvelope<Game[]>(
    `/admin/games?${params.toString()}`,
  );
}

export async function getGame(id: number): Promise<Game> {
  return apiFetch<Game>(`/admin/games/${id}`);
}

export async function createGame(payload: CreateGamePayload): Promise<Game> {
  return apiFetch<Game>("/admin/games", { method: "POST", body: payload });
}

export async function updateGame(
  id: number,
  payload: Partial<CreateGamePayload>,
): Promise<Game> {
  return apiFetch<Game>(`/admin/games/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteGame(id: number): Promise<void> {
  return apiFetch<void>(`/admin/games/${id}`, { method: "DELETE" });
}

export async function toggleGameActive(id: number): Promise<Game> {
  return apiFetch<Game>(`/admin/games/${id}/toggle-active`, {
    method: "PUT",
  });
}

export async function toggleGameFeatured(id: number): Promise<Game> {
  return apiFetch<Game>(`/admin/games/${id}/toggle-featured`, {
    method: "PUT",
  });
}

export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/admin/categories");
}

export async function getCategory(id: number): Promise<Category> {
  return apiFetch<Category>(`/admin/categories/${id}`);
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  return apiFetch<Category>("/admin/categories", {
    method: "POST",
    body: payload,
  });
}

export async function updateCategory(
  id: number,
  payload: Partial<CreateCategoryPayload>,
): Promise<Category> {
  return apiFetch<Category>(`/admin/categories/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`/admin/categories/${id}`, { method: "DELETE" });
}
