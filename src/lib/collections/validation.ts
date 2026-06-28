import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
  coverKey: z.string().max(256).optional(),
  isPublic: z.boolean().optional(),
});

export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
