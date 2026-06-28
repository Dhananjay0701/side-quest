"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPlaceCollectionPicker } from "@/components/search/add-place-collection-picker";
import { MiniPlaceMap } from "@/components/search/mini-place-map";
import { useAddPlaceMutation } from "@/lib/query/hooks";
import { useSearchContext } from "@/components/search/search-provider";
import type { CreatePlaceResult, ExternalPlaceSuggestion, LocalPlaceHit } from "@/lib/search/types";
import Link from "next/link";

type PreviewPlace = LocalPlaceHit | ExternalPlaceSuggestion;

export interface PlaceSavedInfo {
  collectionId: string;
  collectionName: string;
  place: PreviewPlace;
  result: CreatePlaceResult;
}

interface AddPlacePreviewProps {
  place: PreviewPlace;
  onBack: () => void;
  onDone: () => void;
  onSaved?: (info: PlaceSavedInfo) => void;
  isAuthenticated: boolean;
  preferredCollectionId?: string;
}

function isExternal(place: PreviewPlace): place is ExternalPlaceSuggestion {
  return place.kind === "external";
}

export function AddPlacePreview({
  place,
  onBack,
  onDone,
  onSaved,
  isAuthenticated,
  preferredCollectionId,
}: AddPlacePreviewProps) {
  const { sessionToken, refreshSession } = useSearchContext();
  const addMutation = useAddPlaceMutation();
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string | null>(null);

  const lat = place.latitude;
  const lng = place.longitude;
  const hasCoords = lat != null && lng != null && !(lat === 0 && lng === 0);

  if (!isAuthenticated) {
    return (
      <div className="space-y-4 p-1">
        <button type="button" onClick={onBack} className="text-xs text-muted/60 hover:text-foreground">
          ← Back to search
        </button>
        <p className="text-sm text-muted">Sign in to save places to your collections.</p>
        <Button asChild>
          <Link
            href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
          >
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  async function handleAdd() {
    if (!collectionId || !collectionName) return;

    let result: CreatePlaceResult;

    if (isExternal(place)) {
      result = await addMutation.mutateAsync({
        collectionId,
        sessionToken,
        external: {
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          googlePlaceId: place.googlePlaceId,
          placesApiId: place.placesApiId,
          source: "google",
          category: place.category,
        },
      });
      refreshSession();
    } else {
      result = await addMutation.mutateAsync({
        collectionId,
        placeId: place.id,
      });
    }

    onSaved?.({
      collectionId,
      collectionName,
      place,
      result,
    });
    onDone();
  }

  return (
    <div className="space-y-4 p-1">
      <button type="button" onClick={onBack} className="text-xs text-muted/60 hover:text-foreground">
        ← Back to search
      </button>

      <div className="flex gap-3">
        {"coverImageUrl" in place && place.coverImageUrl ? (
          <img
            src={place.coverImageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-background/40 text-muted/50">
            <MapPin className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{place.name}</h3>
          {place.address ? <p className="text-sm text-muted/60">{place.address}</p> : null}
          {"category" in place && place.category ? (
            <p className="mt-1 text-xs capitalize text-muted/45">{place.category}</p>
          ) : null}
        </div>
      </div>

      {hasCoords ? <MiniPlaceMap latitude={lat!} longitude={lng!} name={place.name} /> : null}

      <AddPlaceCollectionPicker
        selectedId={collectionId}
        preferredCollectionId={preferredCollectionId}
        onSelect={(id, name) => {
          setCollectionId(id);
          setCollectionName(name);
        }}
      />

      <Button
        className="w-full"
        disabled={!collectionId || addMutation.isPending}
        onClick={() => void handleAdd()}
      >
        {addMutation.isPending
          ? "Saving…"
          : collectionName
            ? `Save to ${collectionName}`
            : "Select a collection"}
      </Button>

      {addMutation.isError ? (
        <p className="text-xs text-red-400">
          {addMutation.error instanceof Error ? addMutation.error.message : "Failed to add place"}
        </p>
      ) : null}
    </div>
  );
}
