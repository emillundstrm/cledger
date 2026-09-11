-- RPC function: sessions_this_week
-- Returns the count of sessions in the current ISO week (Monday-Sunday)
CREATE OR REPLACE FUNCTION sessions_this_week()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT COALESCE(COUNT(*)::INTEGER, 0)
    FROM public.sessions
    WHERE user_id = auth.uid()
      AND date >= date_trunc('week', CURRENT_DATE)::DATE
      AND date <= (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
$$;

-- RPC function: hard_sessions_last_7_days
-- Returns the count of sessions with intensity='hard' in the last 7 days
CREATE OR REPLACE FUNCTION hard_sessions_last_7_days()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT COALESCE(COUNT(*)::INTEGER, 0)
    FROM public.sessions
    WHERE user_id = auth.uid()
      AND intensity = 'hard'
      AND date >= CURRENT_DATE - INTERVAL '6 days'
      AND date <= CURRENT_DATE;
$$;

-- RPC function: pain_flags_last_30_days
-- Returns injury location counts for the last 30 days
CREATE OR REPLACE FUNCTION pain_flags_last_30_days()
RETURNS TABLE(location VARCHAR, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT si.location, COUNT(*) AS count
    FROM public.session_injuries si
    JOIN public.sessions s ON s.id = si.session_id
    WHERE si.user_id = auth.uid()
      AND s.date >= CURRENT_DATE - INTERVAL '29 days'
      AND s.date <= CURRENT_DATE
    GROUP BY si.location
    ORDER BY count DESC;
$$;

-- RPC function: weekly_session_counts
-- Returns session counts per week for the last 8 weeks
CREATE OR REPLACE FUNCTION weekly_session_counts()
RETURNS TABLE(week_start DATE, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH weeks AS (
        SELECT generate_series(
            (date_trunc('week', CURRENT_DATE) - INTERVAL '49 days')::DATE,
            date_trunc('week', CURRENT_DATE)::DATE,
            INTERVAL '7 days'
        )::DATE AS week_start
    )
    SELECT w.week_start, COALESCE(COUNT(s.id), 0) AS count
    FROM weeks w
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND s.date >= w.week_start
        AND s.date <= w.week_start + 6
    GROUP BY w.week_start
    ORDER BY w.week_start;
$$;

-- RPC function: performance_trend
-- Returns weekly average performance (weak=1, normal=2, strong=3) for last 8 weeks
CREATE OR REPLACE FUNCTION performance_trend()
RETURNS TABLE(week_start DATE, average DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH weeks AS (
        SELECT generate_series(
            (date_trunc('week', CURRENT_DATE) - INTERVAL '49 days')::DATE,
            date_trunc('week', CURRENT_DATE)::DATE,
            INTERVAL '7 days'
        )::DATE AS week_start
    )
    SELECT w.week_start, AVG(
        CASE
            WHEN s.id IS NULL THEN NULL
            WHEN s.performance = 'weak' THEN 1
            WHEN s.performance = 'normal' THEN 2
            WHEN s.performance = 'strong' THEN 3
            ELSE 2
        END
    )::DOUBLE PRECISION AS average
    FROM weeks w
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND s.date >= w.week_start
        AND s.date <= w.week_start + 6
    GROUP BY w.week_start
    ORDER BY w.week_start;
$$;

-- RPC function: productivity_trend
-- Returns weekly average productivity (low=1, normal=2, high=3) for last 8 weeks
CREATE OR REPLACE FUNCTION productivity_trend()
RETURNS TABLE(week_start DATE, average DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH weeks AS (
        SELECT generate_series(
            (date_trunc('week', CURRENT_DATE) - INTERVAL '49 days')::DATE,
            date_trunc('week', CURRENT_DATE)::DATE,
            INTERVAL '7 days'
        )::DATE AS week_start
    )
    SELECT w.week_start, AVG(
        CASE
            WHEN s.id IS NULL THEN NULL
            WHEN s.productivity = 'low' THEN 1
            WHEN s.productivity = 'normal' THEN 2
            WHEN s.productivity = 'high' THEN 3
            ELSE 2
        END
    )::DOUBLE PRECISION AS average
    FROM weeks w
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND s.date >= w.week_start
        AND s.date <= w.week_start + 6
    GROUP BY w.week_start
    ORDER BY w.week_start;
$$;
