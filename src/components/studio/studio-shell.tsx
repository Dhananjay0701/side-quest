"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Compass, History, ImageIcon, LayoutDashboard, Sparkles } from "lucide-react";
import type { ProfileRole } from "@/lib/auth/roles-edge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/studio/explore", label: "Explore", icon: Sparkles },
  { href: "/studio/explore/hero", label: "Hero", icon: Compass },
  { href: "/studio/collections", label: "Covers", icon: ImageIcon },
  { href: "/studio/search", label: "Search", icon: BarChart3 },
  { href: "/studio/history", label: "History", icon: History },
] as const;

interface StudioShellProps {
  children: React.ReactNode;
  role: ProfileRole;
}

export function StudioShell({ children, role }: StudioShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#070b14] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-56 shrink-0 border-r border-border/15 p-5 lg:block">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Studio
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">Editorial CMS</h1>
            <p className="mt-1 text-xs text-muted/50">Role: {role}</p>
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted/60 hover:bg-card/40 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 border-t border-border/10 pt-5">
            <Link
              href="/explore"
              className="text-xs text-muted/45 transition-colors hover:text-muted/70"
            >
              View live Explore page →
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border/15 px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted/35">Random SideQuest</p>
                <p className="text-sm font-medium text-foreground/90">Content Studio</p>
              </div>
              <Link
                href="/explore"
                className="rounded-lg border border-border/20 px-3 py-1.5 text-xs text-muted/60 hover:border-border/35 hover:text-foreground"
              >
                Preview live
              </Link>
            </div>
          </header>
          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
