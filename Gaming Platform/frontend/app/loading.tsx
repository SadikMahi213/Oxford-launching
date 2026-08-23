import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="container flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </main>
  );
}
