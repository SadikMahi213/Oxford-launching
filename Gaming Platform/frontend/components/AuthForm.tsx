"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
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

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const { login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const passwordReset = searchParams.get("reset") === "success";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      if (isRegister) {
        await register({
          name: String(payload.name),
          email: String(payload.email),
          password: String(payload.password),
          password_confirmation: String(payload.password_confirmation),
        });
      } else {
        await login({
          email: String(payload.email),
          password: String(payload.password),
        });
      }
      router.push(redirect);
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isRegister ? "Create account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Register a new player account."
            : "Sign in to your account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {isRegister && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
              {fieldErrors?.name && (
                <p className="text-xs text-destructive">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            {fieldErrors?.email && (
              <p className="text-xs text-destructive">
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
            {fieldErrors?.password && (
              <p className="text-xs text-destructive">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          {isRegister && (
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
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {passwordReset && (
            <p className="text-sm text-green-600" role="status">
              Password has been reset. Please sign in with your new password.
            </p>
          )}

          {!isRegister && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner />}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
