-- Daily aggregated counters for search / enrichment external API usage

CREATE TABLE IF NOT EXISTS search_api_usage (
  usage_date date NOT NULL,
  provider text NOT NULL,
  operation text NOT NULL,
  call_count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (usage_date, provider, operation)
);

CREATE INDEX IF NOT EXISTS idx_search_api_usage_date ON search_api_usage(usage_date DESC);

CREATE OR REPLACE FUNCTION increment_search_api_usage(
  p_usage_date date,
  p_provider text,
  p_operation text,
  p_delta int DEFAULT 1
) RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO search_api_usage (usage_date, provider, operation, call_count)
  VALUES (p_usage_date, p_provider, p_operation, GREATEST(p_delta, 0))
  ON CONFLICT (usage_date, provider, operation)
  DO UPDATE SET call_count = search_api_usage.call_count + GREATEST(p_delta, 0);
$$;
