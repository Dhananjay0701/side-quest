"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMenu } from "@/components/auth/user-menu";
import { CreateCollectionDialog } from "@/components/import/create-collection-dialog";
import { getProfileInitials } from "@/lib/auth/profile-utils";
import { clientProfileToProfile, useProfileQuery } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const { data: clientProfile, isPending } = useProfileQuery();
  const profile = clientProfile ? clientProfileToProfile(clientProfile) : null;

  const initials = profile ? getProfileInitials(profile) : "RS";

  const tabs = [
    { label: "Collections", href: "/" },
    { label: "Explore", href: "/explore" },
  ];

  const authControls =
    profile && !isPending ? (
      <UserMenu profile={profile} initials={initials} />
    ) : (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-[10px] font-semibold text-muted">{initials}</AvatarFallback>
        </Avatar>
      </div>
    );

  const createButton = (variant: "mobile" | "desktop") =>
    profile && !isPending ? (
      <CreateCollectionDialog
        trigger={
          <button
            aria-label="Create new collection"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground",
              variant === "mobile"
                ? "px-3 whitespace-nowrap"
                : "px-3"
            )}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            {variant === "mobile" ? "New collection" : "New collection"}
          </button>
        }
      />
    ) : (
      <Link
        href="/login?next=/"
        aria-label="Create new collection"
        className={cn(
          "flex shrink-0 items-center gap-0.5 rounded-lg border border-border/60 bg-card/60 py-0.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground",
          variant === "mobile" ? "px-3 whitespace-nowrap" : "px-3"
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        {variant === "mobile" ? "Create new collection" : "New collection"}
      </Link>
    );

  const isStudio = pathname.startsWith("/studio");

  if (isStudio) {
    return null;
  }

  return (
    <header className="pwa-safe-top sticky top-0 z-40 border-b border-border/30 bg-[#0B1221]/95 backdrop-blur-xl">
      <div className="lg:hidden">
        <div className="flex h-12 items-center justify-between gap-2 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Compass className="h-4 w-4" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">Random Sidequest</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {createButton("mobile")}
            {authControls}
          </div>
        </div>

        <nav className="flex border-t border-border/20">
          {tabs.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className={cn(
                  "relative flex-1 py-2.5 text-center text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted/70"
                )}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-8 bottom-0 h-[2px] rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative mx-auto hidden max-w-[1400px] lg:block">
        <div className="flex h-12 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Random Sidequest</span>
          </Link>

          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            {tabs.map((tab) => {
              const active =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className={cn(
                    "relative px-4 py-1.5 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted/70 hover:text-foreground/80"
                  )}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {createButton("desktop")}
            {authControls}
          </div>
        </div>
      </div>
    </header>
  );
}
