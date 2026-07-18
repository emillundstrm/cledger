-- Parameterize analytics trend RPCs with a selectable period + adaptive bucketing.
-- Short periods (<= 8 weeks) bucket by ISO week; longer periods bucket by month
-- so a year / all-time view shows a readable number of bars instead of 50+.
--
-- Period values: '4w', '8w', '6m', '1y', 'all' (defaults to '8w' so existing
-- no-arg callers — e.g. the MCP server — keep working unchanged).

-- Helper: resolve a period string into a bucket configuration.
-- Returns the first bucket's start date, the date_trunc unit, and the series step.
CREATE OR REPLACE FUNCTION analytics_bucket_config(period TEXT)
RETURNS TABLE(start_date DATE, unit TEXT, step INTERVAL)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        CASE period
            WHEN '4w' THEN (date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks')::DATE
            WHEN '8w' THEN (date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks')::DATE
            WHEN '6m' THEN (date_trunc('month', CURRENT_DATE) - INTERVAL '5 months')::DATE
            WHEN '1y' THEN (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')::DATE
            WHEN 'all' THEN COALESCE(
                (SELECT date_trunc('month', MIN(s.date))::DATE
                 FROM public.sessions s
                 WHERE s.user_id = auth.uid()),
                date_trunc('month', CURRENT_DATE)::DATE
            )
            ELSE (date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks')::DATE
        END AS start_date,
        CASE period
            WHEN '4w' THEN 'week'
            WHEN '8w' THEN 'week'
            ELSE 'month'
        END AS unit,
        CASE period
            WHEN '4w' THEN INTERVAL '7 days'
            WHEN '8w' THEN INTERVAL '7 days'
            ELSE INTERVAL '1 month'
        END AS step;
$$;

-- weekly_session_counts(period) — session counts per bucket
DROP FUNCTION IF EXISTS weekly_session_counts();
CREATE OR REPLACE FUNCTION weekly_session_counts(period TEXT DEFAULT '8w')
RETURNS TABLE(week_start DATE, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date, unit, step FROM public.analytics_bucket_config(period)
    ),
    buckets AS (
        SELECT generate_series(
            (SELECT start_date FROM cfg),
            date_trunc((SELECT unit FROM cfg), CURRENT_DATE)::DATE,
            (SELECT step FROM cfg)
        )::DATE AS week_start
    )
    SELECT b.week_start, COALESCE(COUNT(s.id), 0) AS count
    FROM buckets b
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND date_trunc((SELECT unit FROM cfg), s.date)::DATE = b.week_start
    GROUP BY b.week_start
    ORDER BY b.week_start;
$$;

-- weekly_training_load(period) — sum(duration * RPE) per bucket
DROP FUNCTION IF EXISTS weekly_training_load();
CREATE OR REPLACE FUNCTION weekly_training_load(period TEXT DEFAULT '8w')
RETURNS TABLE(week_start DATE, load BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date, unit, step FROM public.analytics_bucket_config(period)
    ),
    buckets AS (
        SELECT generate_series(
            (SELECT start_date FROM cfg),
            date_trunc((SELECT unit FROM cfg), CURRENT_DATE)::DATE,
            (SELECT step FROM cfg)
        )::DATE AS week_start
    )
    SELECT b.week_start, COALESCE(SUM(s.duration_minutes * s.intensity), 0)::BIGINT AS load
    FROM buckets b
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND date_trunc((SELECT unit FROM cfg), s.date)::DATE = b.week_start
        AND s.duration_minutes IS NOT NULL
    GROUP BY b.week_start
    ORDER BY b.week_start;
$$;

-- performance_trend(period) — weekly average performance (weak=1, normal=2, strong=3) per bucket
DROP FUNCTION IF EXISTS performance_trend();
CREATE OR REPLACE FUNCTION performance_trend(period TEXT DEFAULT '8w')
RETURNS TABLE(week_start DATE, average DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date, unit, step FROM public.analytics_bucket_config(period)
    ),
    buckets AS (
        SELECT generate_series(
            (SELECT start_date FROM cfg),
            date_trunc((SELECT unit FROM cfg), CURRENT_DATE)::DATE,
            (SELECT step FROM cfg)
        )::DATE AS week_start
    )
    SELECT b.week_start, AVG(
        CASE
            WHEN s.id IS NULL THEN NULL
            WHEN s.performance = 'weak' THEN 1
            WHEN s.performance = 'normal' THEN 2
            WHEN s.performance = 'strong' THEN 3
            ELSE 2
        END
    )::DOUBLE PRECISION AS average
    FROM buckets b
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND date_trunc((SELECT unit FROM cfg), s.date)::DATE = b.week_start
    GROUP BY b.week_start
    ORDER BY b.week_start;
$$;

-- rpe_trend(period) — average RPE (intensity 1-10) per bucket
DROP FUNCTION IF EXISTS rpe_trend();
CREATE OR REPLACE FUNCTION rpe_trend(period TEXT DEFAULT '8w')
RETURNS TABLE(week_start DATE, average DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date, unit, step FROM public.analytics_bucket_config(period)
    ),
    buckets AS (
        SELECT generate_series(
            (SELECT start_date FROM cfg),
            date_trunc((SELECT unit FROM cfg), CURRENT_DATE)::DATE,
            (SELECT step FROM cfg)
        )::DATE AS week_start
    )
    SELECT b.week_start, AVG(
        CASE
            WHEN s.id IS NULL THEN NULL
            ELSE s.intensity::DOUBLE PRECISION
        END
    )::DOUBLE PRECISION AS average
    FROM buckets b
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND date_trunc((SELECT unit FROM cfg), s.date)::DATE = b.week_start
    GROUP BY b.week_start
    ORDER BY b.week_start;
$$;

-- session_type_volume(period) — per bucket, per session type: number of sessions
-- and total minutes. `types` is a TEXT[], so a multi-type session (e.g. boulder +
-- hangboard) contributes to BOTH type rows — type totals can exceed session count.
-- Only (bucket, type) pairs that actually occurred are returned; the frontend
-- pivots these onto the full bucket spine from performance_trend.
CREATE OR REPLACE FUNCTION session_type_volume(period TEXT DEFAULT '8w')
RETURNS TABLE(week_start DATE, type TEXT, session_count BIGINT, total_minutes BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH cfg AS (
        SELECT start_date, unit, step FROM public.analytics_bucket_config(period)
    ),
    expanded AS (
        SELECT
            date_trunc((SELECT unit FROM cfg), s.date)::DATE AS bucket,
            unnest(s.types) AS type,
            s.id AS session_id,
            s.duration_minutes
        FROM public.sessions s
        WHERE s.user_id = auth.uid()
          AND s.date >= (SELECT start_date FROM cfg)
    )
    SELECT
        e.bucket AS week_start,
        e.type,
        COUNT(e.session_id)::BIGINT AS session_count,
        COALESCE(SUM(e.duration_minutes), 0)::BIGINT AS total_minutes
    FROM expanded e
    GROUP BY e.bucket, e.type
    ORDER BY e.bucket, e.type;
$$;
