// import { z } from "zod";
// import { AUDIENCE_OPTIONS, CATEGORY_SLUGS, PROMPT_VERSION, VIBE_OPTIONS } from "@/lib/constants";

// export const enrichmentOutputSchema = z.object({
//   category: z.enum(CATEGORY_SLUGS),
//   tags: z.array(z.string()).max(5),
//   likely_audience: z.enum(AUDIENCE_OPTIONS),
//   likely_vibe: z.enum(VIBE_OPTIONS),
//   short_description: z.string().max(300),
//   confidence: z.number().min(0).max(1),
// });

// export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>;

// export const IMPORT_ENRICHMENT_PROMPT = `You classify travel places for a personal discovery app.

// Given a place name, optional notes, and Google Maps URL, return JSON only:
// {
//   "category": one of ${CATEGORY_SLUGS.join(", ")},
//   "tags": up to 5 lowercase hyphenated tags,
//   "likely_audience": one of ${AUDIENCE_OPTIONS.join(", ")},
//   "likely_vibe": one of ${VIBE_OPTIONS.join(", ")},
//   "short_description": one evocative sentence, no made-up facts,
//   "confidence": 0.0 to 1.0
// }

// Rules:
// - Pick the best-fit category; use "other" if uncertain.
// - Tags should describe the place vibe/type, not duplicate the category.
// - Do not invent addresses, ratings, or hours.
// - Keep short_description under 25 words.`;

// export { PROMPT_VERSION };

import { z } from "zod";
import { CATEGORY_SLUGS, PROMPT_VERSION } from "@/lib/constants";

export const enrichmentOutputSchema = z.object({
  category: z.enum(CATEGORY_SLUGS),
  tags: z.array(z.string()).max(8),
  short_description: z.string().max(300),
  interesting_facts: z.array(z.string()).max(3).default([]),
  confidence: z.number().min(0).max(1),
});

export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>;

export const IMPORT_ENRICHMENT_PROMPT = `You classify travel places for a personal travel discovery app.

Given a place name, optional notes, and Google Maps URL, return JSON only:

{
  "category": one of ${CATEGORY_SLUGS.join(", ")},
  "tags": up to 8 lowercase hyphenated tags,
  "short_description": evocative sentence about things people might like or not know about this place,
  "interesting_facts": up to 3 interesting facts about the place,
  "confidence": 0.0 to 1.0
}

The tags field is the MOST IMPORTANT output.

Generate tags that help users discover places they would enjoy visiting.

Tags should describe:

- atmosphere
- scenery
- activities
- food or drinks
- experience type
- reasons someone would visit
- notable characteristics

Good tag examples:

sunset
ocean-view
live-music
jazz
cocktails
date-night
rooftop
beachfront
waterfall
hiking
nature
photography
local-favorite
hidden-gem
historic
architecture
italian-food
pizza
coffee
brunch
vegetarian-friendly
surfing
kayaking
market
nightlife
quiet
family-friendly
luxury
creative
bohemian
cultural

Bad tag examples:

restaurant
cafe
bar
beach
hotel
activity
nature

Do not repeat the category as a tag.

Rules:

- Pick the best-fit category; use "other" if uncertain.
- Tags should be specific and useful for filtering and recommendations.
- Prefer experiential tags over generic labels.
- Do not invent addresses, ratings, opening hours, menu items, or facts not reasonably inferable.
- Keep short_description under 25 words.
- Return only valid JSON.
- If uncertain, lower the confidence score.

Example:

Input:
Purple Martini Goa

Output:
{
  "category": "bar",
  "tags": [
    "sunset",
    "ocean-view",
    "cocktails",
    "date-night",
    "live-music"
  ],
  "short_description": "A scenic coastal spot known for sunset drinks and a relaxed atmosphere. People like to go in the evenings but it can be crowded at sunsets.",
  "interesting_facts": [
    "The place is known for its expensive drinks and chill atmosphere.",
    "People like to go in the evenings but it can be crowded at sunsets.",
    "The place has a view of the sea but has become too popular on Instagram."
  ],
  "confidence": 0.82
}`;

export { PROMPT_VERSION };