"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Eye, History, ImageIcon, Sparkles } from "lucide-react";
import type { ProfileRole } from "@/lib/auth/roles-edge";
import { isAdminRole } from "@/lib/auth/roles-edge";
import { Button } from "@/components/ui/button";
import { PublishPanel } from "@/components/studio/publish-panel";

interface StudioDashboardProps {
  role: ProfileRole;
}

export function StudioDashboard({ role }: StudioDashboardProps) {
  const canPublish = isAdminRole(role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Studio</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted/55">
            Editorial control center for the Explore homepage and future landing pages. Draft changes
            in Hero and Explore editors, preview, then publish to go live.
          </p>
        </div>
        {canPublish ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/studio/explore/preview" target="_blank">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview draft
              </Link>
            </Button>
            <PublishPanel onPublished={() => {}} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/studio/explore"
          className="group rounded-2xl border border-border/15 bg-card/30 p-6 transition-colors hover:border-primary/30 hover:bg-card/50"
        >
          <Sparkles className="mb-4 h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Explore editor</h3>
          <p className="mt-2 text-sm text-muted/50">
            Sections, ordering, collection picks, visibility, and publish workflow.
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary">
            Open editor <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/studio/history"
          className="group rounded-2xl border border-border/15 bg-card/30 p-6 transition-colors hover:border-primary/30 hover:bg-card/50"
        >
          <History className="mb-4 h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">History & audit</h3>
          <p className="mt-2 text-sm text-muted/50">
            Publish events, section edits, and editorial actions.
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary">
            View history <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/studio/collections"
          className="group rounded-2xl border border-border/15 bg-card/30 p-6 transition-colors hover:border-primary/30 hover:bg-card/50"
        >
          <ImageIcon className="mb-4 h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Collection covers</h3>
          <p className="mt-2 text-sm text-muted/50">
            Upload or replace covers on public collections and your own private collections.
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary">
            Manage covers <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/studio/search"
          className="group rounded-2xl border border-border/15 bg-card/30 p-6 transition-colors hover:border-primary/30 hover:bg-card/50"
        >
          <BarChart3 className="mb-4 h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Search usage</h3>
          <p className="mt-2 text-sm text-muted/50">
            API call counts for Google Autocomplete, Place Details, Photos, and Gemini — autocomplete, enrichment, and cost
            estimates.
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary">
            View stats <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </Link>
      </div>

      <div className="rounded-2xl border border-border/15 bg-card/20 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted/40">
          Workflow
        </h3>
        <ol className="mt-4 space-y-2 text-sm text-muted/55">
          <li>1. Edit draft content in Explore or Hero editors, then save hero changes</li>
          <li>2. Preview draft before publishing</li>
          <li>3. Publish from here or the Explore editor to update the live page</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/studio/explore">Start editing</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/explore/hero">Edit hero</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
