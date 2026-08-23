import { Suspense } from "react";
import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Spinner className="h-8 w-8" />
          </div>
        }
      >
        <AuthForm mode="login" />
      </Suspense>
      <Button asChild variant="link">
        <Link href="/register">Need an account? Register</Link>
      </Button>
    </main>
  );
}
