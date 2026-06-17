-- Store Gemini-generated interesting facts per place
ALTER TABLE place_descriptions
  ADD COLUMN IF NOT EXISTS interesting_facts text[] NOT NULL DEFAULT '{}';
