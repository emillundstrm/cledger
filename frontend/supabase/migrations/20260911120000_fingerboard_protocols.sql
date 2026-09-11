-- Adds the Abralifts and density hang protocols, plus the front-three and
-- back-three grips, and teaches load recommendation their intensities.

ALTER TABLE fingerboard_workouts
    DROP CONSTRAINT IF EXISTS fingerboard_workouts_protocol_check;

ALTER TABLE fingerboard_workouts
    ADD CONSTRAINT fingerboard_workouts_protocol_check
    CHECK (protocol IN ('max_lift', 'repeaters', 'abralifts', 'density_hangs'));

ALTER TABLE fingerboard_sets
    DROP CONSTRAINT IF EXISTS fingerboard_sets_grip_check;

ALTER TABLE fingerboard_sets
    ADD CONSTRAINT fingerboard_sets_grip_check
    CHECK (grip IN (
        'half_crimp',
        'open',
        'full_crimp',
        'three_finger_drag',
        'front_three',
        'back_three'
    ));

-- Recommended working load for a protocol on a given grip/edge/hand.
--
-- Abralifts intensity varies by grip: the stronger positions take ~50% of max,
-- while the front-three and back-three positions are trained much lighter at
-- ~30%. Everything else falls back to the ~40% the published protocol uses.
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
            WHEN p_grip IN ('front_three', 'back_three') THEN 0.30
            WHEN p_grip IN ('half_crimp', 'open', 'three_finger_drag') THEN 0.50
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
