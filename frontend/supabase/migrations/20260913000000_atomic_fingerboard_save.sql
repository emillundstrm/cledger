-- Saves a workout, its sets, and the session it logs, in one transaction.
--
-- These were three sequential client calls, so a failure on the sets insert —
-- a bad grip value, say — left an orphan session and workout already written.
-- Retrying then wrote another of each, silently duplicating the logged session
-- once per attempt. A single function call runs inside one transaction, so a
-- failure rolls the whole thing back and a retry is safe.
CREATE OR REPLACE FUNCTION save_fingerboard_workout(
    p_protocol VARCHAR(30),
    p_bodyweight_kg NUMERIC,
    p_params JSONB,
    p_duration_seconds INTEGER,
    p_completed BOOLEAN,
    p_notes TEXT,
    p_sets JSONB,
    p_session JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_session_id UUID;
    v_workout_id UUID;
    v_set JSONB;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_session IS NOT NULL THEN
        INSERT INTO public.sessions (
            user_id, date, types, intensity, performance, duration_minutes, notes, max_grade, venue
        )
        VALUES (
            v_user,
            (p_session ->> 'date')::DATE,
            ARRAY(SELECT jsonb_array_elements_text(p_session -> 'types')),
            (p_session ->> 'intensity')::SMALLINT,
            p_session ->> 'performance',
            (p_session ->> 'durationMinutes')::INTEGER,
            p_session ->> 'notes',
            p_session ->> 'maxGrade',
            p_session ->> 'venue'
        )
        RETURNING id INTO v_session_id;
    END IF;

    INSERT INTO public.fingerboard_workouts (
        user_id, session_id, protocol, bodyweight_kg, params, duration_seconds, completed, notes
    )
    VALUES (
        v_user, v_session_id, p_protocol, p_bodyweight_kg, p_params,
        p_duration_seconds, p_completed, p_notes
    )
    RETURNING id INTO v_workout_id;

    FOR v_set IN SELECT * FROM jsonb_array_elements(p_sets)
    LOOP
        INSERT INTO public.fingerboard_sets (
            user_id, workout_id, set_index, grip, edge_mm, hand, mode,
            added_kg, lifted_kg, total_load_kg, work_seconds, completed, rpe
        )
        VALUES (
            v_user,
            v_workout_id,
            (v_set ->> 'setIndex')::SMALLINT,
            v_set ->> 'grip',
            (v_set ->> 'edgeMm')::SMALLINT,
            v_set ->> 'hand',
            v_set ->> 'mode',
            (v_set ->> 'addedKg')::NUMERIC,
            (v_set ->> 'liftedKg')::NUMERIC,
            (v_set ->> 'totalLoadKg')::NUMERIC,
            (v_set ->> 'workSeconds')::NUMERIC,
            COALESCE((v_set ->> 'completed')::BOOLEAN, TRUE),
            (v_set ->> 'rpe')::SMALLINT
        );
    END LOOP;

    RETURN v_workout_id;
END;
$$;
