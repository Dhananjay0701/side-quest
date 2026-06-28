import { z } from "zod";

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

export function sanitizeSearchQuery(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").trim().slice(0, 120);
}

export const suggestQuerySchema = z.object({
  q: z.string().max(120).transform(sanitizeSearchQuery),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sessionToken: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  hero: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const lightPlaceInputSchema = z.object({
  name: z.string().min(1).max(300),
  address: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  googlePlaceId: z.string().max(128).nullable().optional(),
  placesApiId: z.string().max(128).nullable().optional(),
  source: z.enum(["import", "google", "manual"]),
  category: z.string().max(100).nullable().optional(),
});

export const createPlaceSchema = z
  .object({
    placeId: z.string().uuid().optional(),
    external: lightPlaceInputSchema.optional(),
    collectionId: z.string().uuid(),
  })
  .refine((data) => Boolean(data.placeId || data.external), {
    message: "Either placeId or external place data is required",
  });

export type SuggestQueryInput = z.infer<typeof suggestQuerySchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
