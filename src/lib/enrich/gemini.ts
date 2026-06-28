import { GoogleGenerativeAI } from "@google/generative-ai";
import { profileAI } from "@/lib/debug/profiler";
import { recordAiMetric } from "@/lib/debug/metrics";
import { recordSearchUsage } from "@/lib/search/usage";

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateGeminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  return profileAI("Gemini", async () => {
    const started = Date.now();
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    if (!text) throw new Error("Empty Gemini response");

    recordSearchUsage("gemini", "enrichment");

    recordAiMetric({
      model: GEMINI_MODEL,
      operation: "generateJson",
      latencyMs: Date.now() - started,
      promptTokens: userPrompt.length,
      completionTokens: text.length,
    });

    return text;
  });
}

export function getEnrichmentModel(): string {
  return GEMINI_MODEL;
}
