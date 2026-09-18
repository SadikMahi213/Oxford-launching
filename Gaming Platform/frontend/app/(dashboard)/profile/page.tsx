"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Gamepad2,
  TrendingUp,
  Shield,
  Award,
  Edit,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getUserStats, getDemoCredits } from "@/lib/api";
import type { UserStats, DemoCredits } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [credits, setCredits] = useState<DemoCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsData, creditsData] = await Promise.allSettled([
        getUserStats(),
        getDemoCredits(),
      ]);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (creditsData.status === "fulfilled") setCredits(creditsData.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Your account details and statistics.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/profile">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{user?.status ?? "active"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">KYC:</span>
                <span className="capitalize">{user?.kyc_status ?? "unverified"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
                <span>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "---"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Credits:</span>
                <span className="font-semibold">
                  {credits?.balance.toLocaleString() ?? "---"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistics
            </CardTitle>
            <CardDescription>Your gaming performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <Gamepad2 className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-2xl font-bold">
                  {stats?.total_games_played ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-green-500" />
                <p className="mt-2 text-2xl font-bold">
                  {(stats?.total_score ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Score</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Trophy className="mx-auto h-6 w-6 text-yellow-500" />
                <p className="mt-2 text-2xl font-bold">
                  #{stats?.unique_games_played ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Unique Games</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Award className="mx-auto h-6 w-6 text-purple-500" />
                <p className="mt-2 text-2xl font-bold">
                  {stats?.best_score ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Best Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard/change-password">Change Password</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/leaderboard">View Leaderboard</Link>
        </Button>
      </div>
    </div>
  );
}
