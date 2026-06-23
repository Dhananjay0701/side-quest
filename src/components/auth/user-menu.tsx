"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UploadDialog } from "@/components/import/upload-dialog";
import { InstallAppMenuItem } from "@/components/pwa/install-app-menu-item";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/db/types";

interface UserMenuProps {
  profile: Profile;
  initials: string;
}

export function UserMenu({ profile, initials }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full outline-none ring-primary/40 focus-visible:ring-2"
        aria-label="Account menu"
      >
        <Avatar className="h-8 w-8">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
          <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
        </Avatar>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 min-w-[200px] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
            <div className="border-b border-border/40 px-4 py-3">
              <p className="text-sm font-semibold">{profile.display_name}</p>
              <p className="text-xs text-muted">@{profile.username}</p>
            </div>
            <div className="p-1">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-card/80 hover:text-foreground"
              >
                <User className="h-4 w-4" />
                My collections
              </Link>
              <UploadDialog
                trigger={
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-card/80 hover:text-foreground"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </button>
                }
              />
              <InstallAppMenuItem onSelect={() => setOpen(false)} />
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
