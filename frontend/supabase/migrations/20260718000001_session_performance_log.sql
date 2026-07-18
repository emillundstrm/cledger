-- Per-session performance within a period, for the dashboard's performance ribbon
-- (one colored segment per logged session: weak / normal / strong).
CREATE OR REPLACE FUNCTION session_performance_log(period TEXT DEFAULT '8w')
RETURNS TABLE(session_date DATE, performance TEXT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date FROM public.analytics_bucket_config(period)
    )
    SELECT s.date AS session_date, s.performance::TEXT
    FROM public.sessions s
    WHERE s.user_id = auth.uid()
      AND s.date >= (SELECT start_date FROM cfg)
    ORDER BY s.date, s.created_at;
$$;
