/** Google Places API (New) — monthly free tiers + pay-as-you-go rates (USD). */

export interface GoogleFreeTierLimits {
  autocompleteSessions: number;
  placeDetails: number;
  placePhotos: number;
}

export interface GooglePricing {
  /** Per completed autocomplete session (after free tier) */
  autocompletePerSession: number;
  /** Place Details Essentials — per request (after free tier) */
  placeDetailsPerRequest: number;
  placePhotoPerRequest: number;
  textSearchPerRequest: number;
  geminiPerCall: number;
}

export interface TieredLineItem {
  label: string;
  usageCount: number;
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  billableCount: number;
  unitPriceUsd: number;
  costUsd: number;
}

export interface GoogleBillingSummary {
  pricing: GooglePricing;
  freeTier: GoogleFreeTierLimits;
  /** Calendar month-to-date (for free-tier remaining) */
  monthToDate: Record<string, number>;
  /** Selected reporting period */
  periodTotals: Record<string, number>;
  lineItems: TieredLineItem[];
  totalCostUsd: number;
  geminiCostUsd: number;
}

export interface SearchEffectivenessMetrics {
  totalSearches: number;
  servedFromDb: number;
  servedFromDbPercent: number;
  googleAutocompleteCalls: number;
  googleAutocompletePercent: number;
  autocompleteCacheHits: number;
  duplicatePlacesPrevented: number;
  enrichmentsSkipped: number;
  estimatedGoogleSavingsUsd: number;
}

export function getGoogleFreeTierLimits(): GoogleFreeTierLimits {
  return {
    autocompleteSessions: Number(process.env.GOOGLE_FREE_AUTOCOMPLETE_SESSIONS ?? 10_000),
    placeDetails: Number(process.env.GOOGLE_FREE_PLACE_DETAILS ?? 10_000),
    placePhotos: Number(process.env.GOOGLE_FREE_PLACE_PHOTOS ?? 1_000),
  };
}

export function getGooglePricing(): GooglePricing {
  return {
    autocompletePerSession: Number(process.env.SEARCH_COST_GOOGLE_AUTOCOMPLETE ?? 0.00283),
    placeDetailsPerRequest: Number(process.env.SEARCH_COST_GOOGLE_PLACE_DETAILS ?? 0.005),
    placePhotoPerRequest: Number(process.env.SEARCH_COST_GOOGLE_PLACE_PHOTO ?? 0.007),
    textSearchPerRequest: Number(process.env.SEARCH_COST_GOOGLE_TEXT_SEARCH ?? 0.032),
    geminiPerCall: Number(process.env.SEARCH_COST_GEMINI_ENRICHMENT ?? 0.0005),
  };
}

/** @deprecated Use getGooglePricing — kept for older imports */
export type SearchUsageCostRates = {
  googleAutocomplete: number;
  googlePlaceDetails: number;
  googleTextSearch: number;
  googlePlacePhoto: number;
  geminiEnrichment: number;
};

export function getSearchUsageCostRates(): SearchUsageCostRates {
  const p = getGooglePricing();
  return {
    googleAutocomplete: p.autocompletePerSession,
    googlePlaceDetails: p.placeDetailsPerRequest,
    googleTextSearch: p.textSearchPerRequest,
    googlePlacePhoto: p.placePhotoPerRequest,
    geminiEnrichment: p.geminiPerCall,
  };
}

export function billableAfterFreeTier(
  usageCount: number,
  freeLimit: number,
  unitPriceUsd: number
): Pick<TieredLineItem, "freeUsed" | "freeRemaining" | "billableCount" | "costUsd"> {
  const freeUsed = Math.min(usageCount, freeLimit);
  const billableCount = Math.max(0, usageCount - freeLimit);
  const freeRemaining = Math.max(0, freeLimit - usageCount);
  return {
    freeUsed,
    freeRemaining,
    billableCount,
    costUsd: billableCount * unitPriceUsd,
  };
}

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Sum usage rows into totals map for a date-filtered subset */
export function aggregateUsageTotals(
  rows: { provider: string; operation: string; call_count: number; usage_date?: string }[],
  options?: { since?: string | null; monthOnly?: boolean }
): Record<string, number> {
  const monthPrefix = currentMonthPrefix();
  const map: Record<string, number> = {};

  for (const row of rows) {
    if (options?.since && row.usage_date && row.usage_date < options.since) continue;
    if (options?.monthOnly && row.usage_date && !row.usage_date.startsWith(monthPrefix)) continue;

    const key = `${row.provider}:${row.operation}`;
    map[key] = (map[key] ?? 0) + Number(row.call_count);
  }

  return map;
}

export function buildGoogleBillingSummary(
  periodTotals: Record<string, number>,
  monthToDate: Record<string, number>
): GoogleBillingSummary {
  const pricing = getGooglePricing();
  const freeTier = getGoogleFreeTierLimits();

  const autocompleteMtd = monthToDate["google:autocomplete"] ?? 0;
  const detailsMtd = monthToDate["google:place_details"] ?? 0;
  const photosMtd = monthToDate["google:place_photo"] ?? 0;

  const acPeriod = periodTotals["google:autocomplete"] ?? 0;
  const detailsPeriod = periodTotals["google:place_details"] ?? 0;
  const photosPeriod = periodTotals["google:place_photo"] ?? 0;
  const textPeriod = periodTotals["google:text_search"] ?? 0;
  const geminiPeriod = periodTotals["gemini:enrichment"] ?? 0;

  const acMtdBill = billableAfterFreeTier(
    autocompleteMtd,
    freeTier.autocompleteSessions,
    pricing.autocompletePerSession
  );
  const detailsMtdBill = billableAfterFreeTier(
    detailsMtd,
    freeTier.placeDetails,
    pricing.placeDetailsPerRequest
  );
  const photosMtdBill = billableAfterFreeTier(
    photosMtd,
    freeTier.placePhotos,
    pricing.placePhotoPerRequest
  );

  const lineItems: TieredLineItem[] = [
    {
      label: "Autocomplete sessions",
      usageCount: acPeriod,
      freeLimit: freeTier.autocompleteSessions,
      freeUsed: acMtdBill.freeUsed,
      freeRemaining: acMtdBill.freeRemaining,
      billableCount: acMtdBill.billableCount,
      unitPriceUsd: pricing.autocompletePerSession,
      costUsd: acMtdBill.costUsd,
    },
    {
      label: "Place Details (Essentials)",
      usageCount: detailsPeriod,
      freeLimit: freeTier.placeDetails,
      freeUsed: detailsMtdBill.freeUsed,
      freeRemaining: detailsMtdBill.freeRemaining,
      billableCount: detailsMtdBill.billableCount,
      unitPriceUsd: pricing.placeDetailsPerRequest,
      costUsd: detailsMtdBill.costUsd,
    },
    {
      label: "Place Photos",
      usageCount: photosPeriod,
      freeLimit: freeTier.placePhotos,
      freeUsed: photosMtdBill.freeUsed,
      freeRemaining: photosMtdBill.freeRemaining,
      billableCount: photosMtdBill.billableCount,
      unitPriceUsd: pricing.placePhotoPerRequest,
      costUsd: photosMtdBill.costUsd,
    },
    {
      label: "Text Search (fallback)",
      usageCount: textPeriod,
      freeLimit: 0,
      freeUsed: 0,
      freeRemaining: 0,
      billableCount: textPeriod,
      unitPriceUsd: pricing.textSearchPerRequest,
      costUsd: textPeriod * pricing.textSearchPerRequest,
    },
  ];

  const geminiCostUsd = geminiPeriod * pricing.geminiPerCall;
  const totalCostUsd =
    lineItems.reduce((sum, item) => sum + item.costUsd, 0) + geminiCostUsd;

  return {
    pricing,
    freeTier,
    monthToDate,
    periodTotals,
    lineItems,
    totalCostUsd,
    geminiCostUsd,
  };
}

export function computeSearchEffectiveness(
  periodTotals: Record<string, number>,
  pricing = getGooglePricing()
): SearchEffectivenessMetrics {
  const totalSearches = periodTotals["search:suggest_request"] ?? 0;
  const suggestNoGoogle = periodTotals["search:suggest_no_google"] ?? 0;
  const cacheHits = periodTotals["google:cache_hit"] ?? 0;
  const googleAutocompleteCalls = periodTotals["google:autocomplete"] ?? 0;
  const duplicatePlacesPrevented = periodTotals["search:duplicate_place_prevented"] ?? 0;
  const enrichmentsSkipped = periodTotals["search:enrichment_skipped"] ?? 0;

  const servedFromDb = suggestNoGoogle + cacheHits;
  const servedFromDbPercent =
    totalSearches > 0 ? Math.round((servedFromDb / totalSearches) * 100) : 0;
  const googleAutocompletePercent =
    totalSearches > 0 ? Math.round((googleAutocompleteCalls / totalSearches) * 100) : 0;

  const autocompleteSavings =
    (cacheHits + suggestNoGoogle) * pricing.autocompletePerSession;
  const enrichmentSavings =
    (duplicatePlacesPrevented + enrichmentsSkipped) *
    (pricing.placeDetailsPerRequest + pricing.placePhotoPerRequest);

  return {
    totalSearches,
    servedFromDb,
    servedFromDbPercent,
    googleAutocompleteCalls,
    googleAutocompletePercent,
    autocompleteCacheHits: cacheHits,
    duplicatePlacesPrevented,
    enrichmentsSkipped,
    estimatedGoogleSavingsUsd: autocompleteSavings + enrichmentSavings,
  };
}

/** @deprecated Use buildGoogleBillingSummary */
export function estimateUsageCostUsd(
  counts: Record<string, number>,
  rates = getSearchUsageCostRates()
): number {
  return buildGoogleBillingSummary(counts, counts).totalCostUsd;
}
