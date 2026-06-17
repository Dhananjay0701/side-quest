"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";

interface CollectionCardMenuProps {
  collectionId: string;
  collectionName: string;
}

export function CollectionCardMenu({ collectionId, collectionName }: CollectionCardMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${collectionName}"? This collection will be hidden from your library.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={menuRef} className="relative z-10">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex aspect-square w-[7cqw] min-w-5 max-w-7 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        aria-label="Collection options"
      >
        <MoreHorizontal className="h-[55%] w-[55%]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5cqw)] min-w-[40cqw] overflow-hidden rounded-lg border border-border/60 bg-card shadow-xl"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="flex w-full items-center gap-[2cqw] px-[3cqw] py-[2cqw] text-left text-[3.2cqw] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 className="h-[1.1em] w-[1.1em]" />
            {deleting ? "Deleting…" : "Delete List"}
          </button>
        </div>
      )}
    </div>
  );
}
