import { apiFetch, apiFetchEnvelope } from "./api/client";
import type { ApiEnvelope, PaginationMeta, User } from "./api/types";
import type { Game } from "./games/types";

export interface DemoCredits {
  balance: number;
  last_daily_bonus_at: string | null;
  can_claim_daily: boolean;
}

export interface DailyBonusResponse {
  bonus_amount: number;
  new_balance: number;
}

export interface UserStats {
  total_games_played: number;
  total_score: number;
  unique_games_played: number;
  best_score: number;
  average_score: number;
  demo_balance: number;
}

export interface ScoreHistoryEntry {
  id: number;
  game_name: string;
  game_slug: string;
  score: number;
  played_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_name: string;
  total_score: number;
  games_played: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  game_count: number;
}

export interface ScoreSubmission {
  game_id: number;
  score: number;
}

// Demo Credits
export function getDemoCredits() {
  return apiFetch<DemoCredits>("/demo-credits/balance");
}

export function claimDailyBonus() {
  return apiFetch<DailyBonusResponse>("/demo-credits/daily-bonus", {
    method: "POST",
  });
}

export function getUserStats() {
  return apiFetch<UserStats>("/demo-credits/stats");
}

// Scores
export function getScoreHistory(params?: { page?: number; per_page?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  const query = searchParams.toString();
  return apiFetch<{ data: ScoreHistoryEntry[] } & PaginationMeta>(
    `/scores/history${query ? `?${query}` : ""}`
  );
}

export function getLeaderboard(params?: {
  game_slug?: string;
  period?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.game_slug) searchParams.set("game_slug", params.game_slug);
  if (params?.period) searchParams.set("period", params.period);
  const query = searchParams.toString();
  return apiFetch<LeaderboardEntry[]>(
    `/scores/leaderboard${query ? `?${query}` : ""}`
  );
}

export function submitScore(payload: ScoreSubmission) {
  return apiFetch<{ score: number; rank: number }>("/scores", {
    method: "POST",
    body: payload,
  });
}

// Games
export function getAllGames(params?: {
  category?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  const query = searchParams.toString();
  return apiFetchEnvelope<Game[]>(
    `/games${query ? `?${query}` : ""}`
  );
}

export function getFeaturedGames() {
  return apiFetch<Game[]>("/games/featured");
}

export function getGameBySlug(slug: string) {
  return apiFetch<Game>(`/games/by-slug/${slug}`);
}

export function getGameCategories() {
  return apiFetch<Category[]>("/categories");
}
