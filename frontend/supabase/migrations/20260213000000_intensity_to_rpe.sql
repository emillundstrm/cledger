-- Convert intensity from categorical string to numeric RPE (1-10)
-- Data conversion: easy→3, moderate→5, hard→8
ALTER TABLE sessions
    ALTER COLUMN intensity TYPE SMALLINT
    USING CASE
        WHEN intensity = 'easy' THEN 3
        WHEN intensity = 'moderate' THEN 5
        WHEN intensity = 'hard' THEN 8
        ELSE 5
    END;

ALTER TABLE sessions
    ADD CONSTRAINT sessions_intensity_rpe_check CHECK (intensity BETWEEN 1 AND 10);

-- Recreate hard_sessions_last_7_days — now counts sessions with RPE >= 8
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
      AND intensity >= 8
      AND date >= CURRENT_DATE - INTERVAL '6 days'
      AND date <= CURRENT_DATE;
$$;

-- Recreate weekly_training_load — RPE value is already numeric, use directly
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
        s.duration_minutes * s.intensity
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

-- Recreate current_week_training_load — same simplification
CREATE OR REPLACE FUNCTION current_week_training_load()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT COALESCE(SUM(
        duration_minutes * intensity
    ), 0)::INTEGER
    FROM public.sessions
    WHERE user_id = auth.uid()
      AND date >= date_trunc('week', CURRENT_DATE)::DATE
      AND date <= (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE
      AND duration_minutes IS NOT NULL;
$$;
