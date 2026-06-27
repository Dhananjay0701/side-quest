"use client";

import Link from "next/link";
import { CollectionsSection } from "@/components/collections/collection-hero-card";
import { DiscoverSection } from "@/components/home/discover-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomePageSkeleton } from "@/components/home/home-page-skeleton";
import { OnboardingEmpty } from "@/components/home/onboarding-empty";
import { MobileUploadBar } from "@/components/layout/mobile-upload-bar";
import { RecentlyAddedRow } from "@/components/places/place-card";
import {
  clientProfileToProfile,
  useCollectionsQuery,
  useProfileQuery,
  useRecentPlacesQuery,
} from "@/lib/query/hooks";
import { useHomepageImagePreload } from "@/lib/images/cache";
import { cn } from "@/lib/utils";

export function HomePageClient() {
  const profileQuery = useProfileQuery();
  const isAuthenticated = Boolean(profileQuery.data);
  const collectionsQuery = useCollectionsQuery(isAuthenticated);
  const recentQuery = useRecentPlacesQuery(isAuthenticated);

  const profile = profileQuery.data ? clientProfileToProfile(profileQuery.data) : null;
  const collections = collectionsQuery.data ?? [];
  const recent = recentQuery.data ?? [];

  const isFirstLoad =
    profileQuery.isPending ||
    (isAuthenticated && collectionsQuery.isPending && collectionsQuery.data === undefined);

  const isBackgroundRefresh =
    (collectionsQuery.isFetching && collectionsQuery.data !== undefined) ||
    (recentQuery.isFetching && recentQuery.data !== undefined);

  const error =
    profileQuery.error?.message ??
    collectionsQuery.error?.message ??
    recentQuery.error?.message ??
    null;

  useHomepageImagePreload(collections, recent, isAuthenticated && !isFirstLoad);

  if (isFirstLoad) {
    return <HomePageSkeleton />;
  }

  const hasCollections = collections.length > 0;

  return (
    <div
      className={cn(
        "min-h-screen transition-opacity duration-300 ease-out",
        isBackgroundRefresh && "opacity-[0.98]"
      )}
    >
      {error && (
        <div className="mx-4 mt-2 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2.5 text-xs text-secondary md:mx-6 md:mt-3">
          {error} — check <code>.env.local</code> and run Supabase migrations.
        </div>
      )}

      {!profile && (
        <div className="mx-4 mt-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm md:mx-6 md:mt-3">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to create private collections and upload your Google Maps lists.
        </div>
      )}

      <HeroSection
        showOnboarding={profile ? !hasCollections : false}
        onboardingSlot={profile && !hasCollections ? <OnboardingEmpty /> : undefined}
      />

      {profile && <MobileUploadBar />}

      <div className="transition-all duration-300 ease-out">
        <CollectionsSection collections={collections} cacheTier="homepage" />
      </div>

      {hasCollections && <DiscoverSection className="hidden md:block" />}

      {hasCollections && (
        <div className="transition-all duration-300 ease-out">
          <RecentlyAddedRow places={recent} cacheTier="homepage" />
        </div>
      )}
    </div>
  );
}
