"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email,
      token,
      password: String(formData.get("password")),
      password_confirmation: String(formData.get("password_confirmation")),
    };

    try {
      await apiFetch<null>("/auth/reset-password", {
        method: "POST",
        body: payload,
        auth: false,
      });
      router.push("/login?reset=success");
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

  if (!token || !email) {
    return (
      <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid reset link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Please request
              a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/forgot-password">Request new link</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="token" value={token} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
              />
              {fieldErrors?.password && (
                <p className="text-xs text-destructive">
                  {fieldErrors.password[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password_confirmation">Confirm password</Label>
              <Input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Spinner />}
              Reset password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
