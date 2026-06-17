import Link from "next/link";
import { CollectionsSection } from "@/components/collections/collection-hero-card";
import { DiscoverSection } from "@/components/home/discover-section";
import { HeroSection } from "@/components/home/hero-section";
import { OnboardingEmpty } from "@/components/home/onboarding-empty";
import { MobileUploadBar } from "@/components/layout/mobile-upload-bar";
import { RecentlyAddedRow } from "@/components/places/place-card";
import { getAuthProfile } from "@/lib/auth/session";
import { getMyCollections, getRecentPlaces } from "@/lib/db/queries/collections";

export default async function HomePage() {
  const profile = await getAuthProfile();
  let collections: Awaited<ReturnType<typeof getMyCollections>> = [];
  let recent: Awaited<ReturnType<typeof getRecentPlaces>> = [];
  let error: string | null = null;

  try {
    if (profile) {
      [collections, recent] = await Promise.all([
        getMyCollections(profile.id),
        getRecentPlaces(profile.id),
      ]);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const hasCollections = collections.length > 0;

  return (
    <div className="min-h-screen">
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

      <CollectionsSection collections={collections} />

      {hasCollections && <DiscoverSection className="hidden md:block" />}

      {hasCollections && <RecentlyAddedRow places={recent} />}
    </div>
  );
}
