"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
  className,
}: SortableListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function reorder(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const ids = items.map((item) => item.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    void onReorder(ids);
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const isDragging = draggingId === item.id;
        const isOver = overId === item.id && draggingId !== item.id;

        return (
          <li
            key={item.id}
            draggable={!disabled}
            onDragStart={() => setDraggingId(item.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(item.id);
            }}
            onDragLeave={() => {
              if (overId === item.id) setOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingId) reorder(draggingId, item.id);
              setDraggingId(null);
              setOverId(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-background/30 px-2 py-2 text-sm transition-colors",
              isDragging && "opacity-50",
              isOver && "ring-1 ring-primary/40"
            )}
          >
            {!disabled ? (
              <span
                className="cursor-grab text-muted/30 active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
          </li>
        );
      })}
    </ul>
  );
}
