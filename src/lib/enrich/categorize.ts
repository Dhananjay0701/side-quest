import { PROMPT_VERSION } from "@/lib/constants";
import { generateGeminiJson, getEnrichmentModel } from "@/lib/enrich/gemini";
import {
  enrichmentOutputSchema,
  IMPORT_ENRICHMENT_PROMPT,
  type EnrichmentOutput,
} from "@/lib/enrich/prompts";

export async function enrichPlaceWithLlm(input: {
  name: string;
  notes: string | null;
  googleMapsUrl: string;
}): Promise<EnrichmentOutput> {
  const userContent = [
    `Name: ${input.name}`,
    input.notes ? `Notes: ${input.notes}` : null,
    `URL: ${input.googleMapsUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateGeminiJson(IMPORT_ENRICHMENT_PROMPT, userContent);
  const parsedJson = JSON.parse(raw) as Record<string, unknown>;

  // Accept legacy "Interesting facts" key from older prompt versions
  if (!parsedJson.interesting_facts && parsedJson["Interesting facts"]) {
    parsedJson.interesting_facts = parsedJson["Interesting facts"];
  }

  const parsed = enrichmentOutputSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error(`Invalid Gemini output: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

export { getEnrichmentModel };
