"use client";

import { Upload } from "lucide-react";
import { UploadDialog } from "@/components/import/upload-dialog";

export function MobileUploadBar() {
  return (
    <div className="px-4 pb-3 lg:hidden">
      <UploadDialog
        trigger={
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/60 py-2.5 text-sm font-medium text-muted transition-colors active:bg-card">
            <Upload className="h-4 w-4" />
            Upload Google Maps Export
          </button>
        }
      />
    </div>
  );
}
