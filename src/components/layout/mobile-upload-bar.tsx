"use client";

import { Plus } from "lucide-react";
import { CreateCollectionDialog } from "@/components/import/create-collection-dialog";

export function MobileUploadBar() {
  return (
    <div className="px-4 pb-3 lg:hidden">
      <CreateCollectionDialog
        trigger={
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/60 py-2.5 text-sm font-medium text-muted transition-colors active:bg-card">
            <Plus className="h-4 w-4" />
            New collection
          </button>
        }
      />
    </div>
  );
}
