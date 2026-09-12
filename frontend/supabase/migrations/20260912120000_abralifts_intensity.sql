-- Corrects Abralifts intensities.
--
-- The routine's published figures ("70-80% of what it would take to lift from
-- the ground") describe a two-handed lift, while loads here are recorded per
-- hand — so taking them at face value doubled the intended intensity. The
-- study behind the protocol states ~40% of max, "light strain on the
-- forearms", which matches halving the published figure.
--
-- The weaker positions keep the routine's relative shape, scaled by the same
-- factor: 50-60% becomes ~30%, and 30-40% becomes ~20%. The front-three and
-- back-three positions stay at the 30% the user already trains.
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
    v_last_load NUMERIC;
    v_all_completed BOOLEAN;
    v_median_rpe NUMERIC;
    v_factor NUMERIC;
BEGIN
    v_pct := CASE p_protocol
        WHEN 'max_lift' THEN 1.00
        WHEN 'repeaters' THEN 0.65
        WHEN 'density_hangs' THEN 0.65
        WHEN 'abralifts' THEN CASE
            WHEN p_grip IN ('middle_two_crimp', 'front_two_crimp') THEN 0.20
            WHEN p_grip IN ('middle_two_pocket', 'front_two_pocket') THEN 0.30
            WHEN p_grip IN ('front_three', 'back_three') THEN 0.30
            ELSE 0.40
        END
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

    SELECT
        MAX(s.total_load_kg),
        BOOL_AND(s.completed),
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.rpe)
    INTO v_last_load, v_all_completed, v_median_rpe
    FROM public.fingerboard_sets s
    WHERE s.workout_id = (
        SELECT w.id
        FROM public.fingerboard_workouts w
        JOIN public.fingerboard_sets s2 ON s2.workout_id = w.id
        WHERE w.user_id = auth.uid()
          AND w.protocol = p_protocol
          AND w.completed
          AND s2.grip = p_grip
          AND s2.edge_mm = p_edge_mm
          AND s2.hand = p_hand
        ORDER BY w.performed_at DESC
        LIMIT 1
    );

    IF v_last_load IS NOT NULL THEN
        v_factor := CASE
            WHEN NOT v_all_completed THEN 0.95
            WHEN v_median_rpe IS NOT NULL AND v_median_rpe >= 10 THEN 0.95
            WHEN v_median_rpe IS NULL OR v_median_rpe <= 7 THEN 1.025
            ELSE 1.0
        END;
        RETURN QUERY SELECT ROUND(v_last_load * v_factor, 1), 'last_session'::TEXT, v_last_load;
        RETURN;
    END IF;

    RETURN QUERY SELECT NULL::NUMERIC, 'none'::TEXT, NULL::NUMERIC;
END;
$$;
