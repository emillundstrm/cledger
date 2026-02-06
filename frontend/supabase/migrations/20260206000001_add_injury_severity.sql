-- Add severity column to session_injuries (nullable for backwards compatibility)
-- Severity scale: 1=Tweak, 2=Minor, 3=Moderate, 4=Limiting, 5=Severe
ALTER TABLE session_injuries
    ADD COLUMN severity INTEGER CHECK (severity >= 1 AND severity <= 5);

-- Replace pain_flags_last_30_days to include severity-weighted counts
-- Returns location, count, and weighted_count (using severity as weight, default 1 for NULL severity)
CREATE OR REPLACE FUNCTION pain_flags_last_30_days()
RETURNS TABLE(location VARCHAR, count BIGINT, weighted_count NUMERIC)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT si.location,
           COUNT(*) AS count,
           SUM(COALESCE(si.severity, 1))::NUMERIC AS weighted_count
    FROM public.session_injuries si
    JOIN public.sessions s ON s.id = si.session_id
    WHERE si.user_id = auth.uid()
      AND s.date >= CURRENT_DATE - INTERVAL '29 days'
      AND s.date <= CURRENT_DATE
    GROUP BY si.location
    ORDER BY weighted_count DESC;
$$;
