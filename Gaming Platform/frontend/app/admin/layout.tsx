"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import {
  LayoutDashboard,
  Gamepad2,
  FolderOpen,
  Users,
  Shield,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p>Access denied. Please log in.</p>
      </div>
    );
  }

  const isAdmin = user.roles?.includes("admin");
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-semibold">Admin Access Required</p>
          <p className="text-sm text-zinc-400">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <Gamepad2 className="h-6 w-6 text-violet-500" />
          <span className="text-lg font-bold tracking-tight">Admin Panel</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-600/20 text-violet-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-300">
              Gaming Platform
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-violet-600/20 px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-400">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
