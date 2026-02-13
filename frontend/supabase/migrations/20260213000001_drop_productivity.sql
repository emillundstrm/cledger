-- Drop the old productivity_trend RPC
DROP FUNCTION IF EXISTS productivity_trend();

-- Create rpe_trend RPC — averages numeric intensity (1-10) per week
CREATE OR REPLACE FUNCTION rpe_trend()
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
            ELSE s.intensity::DOUBLE PRECISION
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

-- Drop the productivity column
ALTER TABLE sessions DROP COLUMN productivity;
