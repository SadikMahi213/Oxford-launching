import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gaming Platform",
  description: "Production-grade online gaming platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
