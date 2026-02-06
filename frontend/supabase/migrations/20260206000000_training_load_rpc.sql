-- RPC function: weekly_training_load
-- Returns training load per week for the last 8 weeks
-- Load = duration_minutes × intensity_factor (easy=1, moderate=2, hard=3)
-- Sessions without duration are excluded
CREATE OR REPLACE FUNCTION weekly_training_load()
RETURNS TABLE(week_start DATE, load BIGINT)
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
    SELECT w.week_start, COALESCE(SUM(
        s.duration_minutes * CASE
            WHEN s.intensity = 'easy' THEN 1
            WHEN s.intensity = 'moderate' THEN 2
            WHEN s.intensity = 'hard' THEN 3
            ELSE 2
        END
    ), 0)::BIGINT AS load
    FROM weeks w
    LEFT JOIN public.sessions s
        ON s.user_id = auth.uid()
        AND s.date >= w.week_start
        AND s.date <= w.week_start + 6
        AND s.duration_minutes IS NOT NULL
    GROUP BY w.week_start
    ORDER BY w.week_start;
$$;

-- RPC function: current_week_training_load
-- Returns the total training load for the current ISO week
CREATE OR REPLACE FUNCTION current_week_training_load()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT COALESCE(SUM(
        duration_minutes * CASE
            WHEN intensity = 'easy' THEN 1
            WHEN intensity = 'moderate' THEN 2
            WHEN intensity = 'hard' THEN 3
            ELSE 2
        END
    ), 0)::INTEGER
    FROM public.sessions
    WHERE user_id = auth.uid()
      AND date >= date_trunc('week', CURRENT_DATE)::DATE
      AND date <= (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE
      AND duration_minutes IS NOT NULL;
$$;
