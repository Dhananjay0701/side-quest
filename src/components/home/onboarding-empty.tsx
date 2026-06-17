"use client";

import { MapPin, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/import/upload-dialog";

export function OnboardingEmpty() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-border/50 bg-card/40 px-8 py-10 backdrop-blur-sm">
      {/* Illustration */}
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/5" />
        <div className="absolute inset-3 rounded-full border border-primary/20" />
        <div className="absolute inset-6 rounded-full border border-dashed border-primary/30" />
        <div className="relative flex flex-col items-center gap-1">
          <Sparkles className="h-5 w-5 text-secondary" />
          <MapPin className="h-8 w-8 text-primary" />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">Start your travel universe</h2>
      <p className="mt-3 text-center text-sm leading-relaxed text-muted">
        Upload a Google Maps export to turn your saved places into beautiful,
        browsable collections.
      </p>

      <UploadDialog
        trigger={
          <Button size="lg" className="mt-6 gap-2 px-8">
            <Upload className="h-4 w-4" />
            Upload Google Maps Export
          </Button>
        }
      />

      <p className="mt-4 text-xs text-muted/70">CSV format · Title, URL columns required</p>
    </div>
  );
}
