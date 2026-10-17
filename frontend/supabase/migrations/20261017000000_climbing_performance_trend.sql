-- The performance ribbon counts climbing sessions only (boulder, routes, board). Runs are
-- imported as 'normal' and fingerboard sessions are logged as 'normal' by default, so
-- they diluted every bucket with ratings nobody made.
--
-- Each session also carries a rolling score: the mean of weak = -1, normal = 0,
-- strong = +1 over the climbing sessions in the 14 days ending on its date. The
-- window reaches back before the period start, so the first sessions of a period are
-- not scored on their own.
DROP FUNCTION IF EXISTS session_performance_log(TEXT);
CREATE OR REPLACE FUNCTION session_performance_log(period TEXT DEFAULT '8w')
RETURNS TABLE(session_date DATE, performance TEXT, rolling_score NUMERIC)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date FROM public.analytics_bucket_config(period)
    ),
    climbing AS (
        SELECT
            s.date,
            s.created_at,
            s.performance::TEXT AS performance,
            AVG(
                CASE s.performance
                    WHEN 'weak' THEN -1
                    WHEN 'strong' THEN 1
                    ELSE 0
                END
            ) OVER (
                ORDER BY s.date
                RANGE BETWEEN INTERVAL '13 days' PRECEDING AND CURRENT ROW
            ) AS rolling_score
        FROM public.sessions s
        WHERE s.user_id = auth.uid()
          AND s.types && ARRAY['boulder', 'routes', 'board']
          AND s.date >= (SELECT start_date FROM cfg) - 13
    )
    SELECT c.date, c.performance, ROUND(c.rolling_score, 2)
    FROM climbing c
    WHERE c.date >= (SELECT start_date FROM cfg)
    ORDER BY c.date, c.created_at;
$$;
