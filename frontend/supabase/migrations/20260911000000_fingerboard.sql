-- Fingerboard training: workouts, sets, and load recommendation.
--
-- Load model: every set records total_load_kg, the absolute force through the
-- fingers, regardless of mode. A hang is bodyweight + added_kg (added_kg may be
-- negative for assistance); a pickup is the lifted weight. Raw inputs are kept
-- alongside. total_load_kg is written by the application rather than generated,
-- because bodyweight lives on the parent workout and generated columns cannot
-- reference other tables.

CREATE TABLE IF NOT EXISTS fingerboard_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    protocol VARCHAR(30) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    bodyweight_kg NUMERIC(5, 2),
    params JSONB NOT NULL DEFAULT '{}'::JSONB,
    duration_seconds INTEGER,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fingerboard_workouts_protocol_check
        CHECK (protocol IN ('max_lift', 'repeaters'))
);

CREATE TABLE IF NOT EXISTS fingerboard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES fingerboard_workouts(id) ON DELETE CASCADE,
    set_index SMALLINT NOT NULL,
    grip VARCHAR(20) NOT NULL,
    edge_mm SMALLINT NOT NULL,
    hand VARCHAR(10) NOT NULL,
    mode VARCHAR(10) NOT NULL,
    added_kg NUMERIC(6, 2),
    lifted_kg NUMERIC(6, 2),
    total_load_kg NUMERIC(6, 2) NOT NULL,
    work_seconds NUMERIC(5, 2),
    completed BOOLEAN NOT NULL DEFAULT TRUE,
    rpe SMALLINT,
    -- Reserved for a Bluetooth force gauge (Tindeq Progressor / BT scale).
    -- Unused today; populated from the device when one is added.
    peak_force_kg NUMERIC(6, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fingerboard_sets_grip_check
        CHECK (grip IN ('half_crimp', 'open', 'full_crimp', 'three_finger_drag')),
    CONSTRAINT fingerboard_sets_hand_check
        CHECK (hand IN ('both', 'left', 'right')),
    CONSTRAINT fingerboard_sets_mode_check
        CHECK (mode IN ('hang', 'pickup')),
    CONSTRAINT fingerboard_sets_edge_check
        CHECK (edge_mm BETWEEN 1 AND 100),
    CONSTRAINT fingerboard_sets_rpe_check
        CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_fingerboard_workouts_user_id
    ON fingerboard_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_fingerboard_workouts_user_performed
    ON fingerboard_workouts(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fingerboard_workouts_session_id
    ON fingerboard_workouts(session_id);
CREATE INDEX IF NOT EXISTS idx_fingerboard_sets_user_id
    ON fingerboard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_fingerboard_sets_workout_id
    ON fingerboard_sets(workout_id);
-- Supports the per-grip/edge/hand max and recommendation lookups.
CREATE INDEX IF NOT EXISTS idx_fingerboard_sets_key
    ON fingerboard_sets(user_id, grip, edge_mm, hand);

CREATE TRIGGER fingerboard_workouts_updated_at
    BEFORE UPDATE ON fingerboard_workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fingerboard_sets_updated_at
    BEFORE UPDATE ON fingerboard_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE fingerboard_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fingerboard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own fingerboard workouts"
    ON fingerboard_workouts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fingerboard workouts"
    ON fingerboard_workouts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fingerboard workouts"
    ON fingerboard_workouts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fingerboard workouts"
    ON fingerboard_workouts FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select own fingerboard sets"
    ON fingerboard_sets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fingerboard sets"
    ON fingerboard_sets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fingerboard sets"
    ON fingerboard_sets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fingerboard sets"
    ON fingerboard_sets FOR DELETE
    USING (auth.uid() = user_id);

-- Best successful pickup load per grip x edge x hand. This is the measured MVC
-- that drives load recommendation for every other protocol.
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
      AND s.mode = 'pickup'
      AND s.completed
    ORDER BY s.grip, s.edge_mm, s.hand, s.total_load_kg DESC, w.performed_at DESC;
$$;

-- Recommended working load for a protocol on a given grip/edge/hand.
--
-- 1. A measured max under 120 days old wins: prescribe a percentage of it.
-- 2. Otherwise progress from the last completed workout of the same protocol
--    and key, based on whether sets were completed and how hard they felt.
-- 3. Otherwise return NULL and let the user enter a load.
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
    -- Protocol intensity as a fraction of measured max. Conservative on
    -- purpose, and kept in one place so they are easy to tune later.
    v_pct := CASE p_protocol
        WHEN 'repeaters' THEN 0.65
        WHEN 'max_lift' THEN 1.00
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
