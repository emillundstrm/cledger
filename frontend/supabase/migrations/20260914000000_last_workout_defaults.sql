-- Maxima come only from max-lift tests, and loads default to last time.
--
-- fingerboard_maxes() counted the best completed pickup from *any* workout, so
-- a submaximal Abralifts set at 5kg was recorded as a 5kg maximum — and the
-- next session then prescribed a fraction of that, spiralling downward.
-- A maximum is only meaningful from a session that actually tested one.
CREATE OR REPLACE FUNCTION fingerboard_maxes()
RETURNS TABLE(
    grip VARCHAR(20),
    edge_mm SMALLINT,
    hand VARCHAR(10),
    max_load_kg NUMERIC,
    tested_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT DISTINCT ON (s.grip, s.edge_mm, s.hand)
        s.grip,
        s.edge_mm,
        s.hand,
        s.total_load_kg AS max_load_kg,
        w.performed_at AS tested_at
    FROM public.fingerboard_sets s
    JOIN public.fingerboard_workouts w ON w.id = s.workout_id
    WHERE s.user_id = auth.uid()
      AND w.protocol = 'max_lift'
      AND s.mode = 'pickup'
      AND s.completed
    ORDER BY s.grip, s.edge_mm, s.hand, s.total_load_kg DESC, w.performed_at DESC;
$$;

-- A single intensity per protocol, applied to each grip's own measured max.
--
-- The previous per-grip percentages (20% for a two-finger crimp, say) were
-- derived from that position being roughly half as strong as a half crimp —
-- they are fractions of the *half crimp* max. Applying them to a directly
-- measured two-finger max counted that weakness twice. Either the percentage
-- is per-grip against one reference, or it is uniform against each grip's own
-- max; mixing the two is what produced absurdly light prescriptions.
CREATE OR REPLACE FUNCTION recommend_fingerboard_load(
    p_protocol VARCHAR(30),
    p_grip VARCHAR(20),
    p_edge_mm SMALLINT,
    p_hand VARCHAR(10)
)
RETURNS TABLE(recommended_kg NUMERIC, source TEXT, basis_kg NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_max NUMERIC;
    v_pct NUMERIC;
BEGIN
    v_pct := CASE p_protocol
        WHEN 'max_lift' THEN 1.00
        WHEN 'repeaters' THEN 0.65
        WHEN 'density_hangs' THEN 0.65
        WHEN 'abralifts' THEN 0.40
        ELSE NULL
    END;

    SELECT m.max_load_kg INTO v_max
    FROM public.fingerboard_maxes() m
    WHERE m.grip = p_grip
      AND m.edge_mm = p_edge_mm
      AND m.hand = p_hand
      AND m.tested_at >= now() - INTERVAL '120 days';

    IF v_max IS NOT NULL AND v_pct IS NOT NULL THEN
        RETURN QUERY SELECT ROUND(v_max * v_pct, 1), 'measured_max'::TEXT, v_max;
        RETURN;
    END IF;

    RETURN QUERY SELECT NULL::NUMERIC, 'none'::TEXT, NULL::NUMERIC;
END;
$$;

-- The shape and loads of the most recent completed workout of a protocol.
-- This is the default for the next one: what you did last time beats any
-- derived figure, and needs no maximum to have been tested at all.
CREATE OR REPLACE FUNCTION last_fingerboard_workout(p_protocol VARCHAR(30))
RETURNS TABLE(
    position_index INTEGER,
    grip VARCHAR(20),
    edge_mm SMALLINT,
    sets INTEGER,
    load_kg NUMERIC,
    mode VARCHAR(10)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH last_workout AS (
        SELECT w.id
        FROM public.fingerboard_workouts w
        WHERE w.user_id = auth.uid()
          AND w.protocol = p_protocol
          AND w.completed
        ORDER BY w.performed_at DESC
        LIMIT 1
    ),
    positions AS (
        SELECT
            s.grip,
            s.edge_mm,
            s.mode,
            MIN(s.set_index) AS first_set,
            COUNT(DISTINCT s.set_index)::INTEGER AS sets,
            (ARRAY_AGG(COALESCE(s.lifted_kg, s.added_kg) ORDER BY s.set_index))[1] AS load_kg
        FROM public.fingerboard_sets s
        WHERE s.workout_id = (SELECT id FROM last_workout)
        GROUP BY s.grip, s.edge_mm, s.mode
    )
    SELECT
        (ROW_NUMBER() OVER (ORDER BY first_set))::INTEGER AS position_index,
        grip,
        edge_mm,
        sets,
        load_kg,
        mode
    FROM positions
    ORDER BY first_set;
$$;
