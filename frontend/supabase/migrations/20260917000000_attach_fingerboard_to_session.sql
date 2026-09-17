-- A second fingerboard workout on the same day can join the session already
-- logged for it, instead of writing a new one.
--
-- Two workouts in one visit to the gym were two sessions, which every count
-- over the sessions table then read as two days of training: session counts,
-- type volume, hard-session counts and training load all double-counted the
-- day. The workouts table was always modelled for this — session_id is a
-- plain many-to-one — but the save path unconditionally inserted a session.
--
-- p_session_id attaches the workout to an existing session instead. The
-- session keeps its own RPE and performance: they were rated for the visit as
-- a whole, and a later workout has no better claim on them than the first.
-- Only what is genuinely additive changes — the minutes trained, the types
-- covered, and the notes.
DROP FUNCTION IF EXISTS save_fingerboard_workout(
    VARCHAR, NUMERIC, JSONB, INTEGER, BOOLEAN, TEXT, JSONB, JSONB
);

CREATE OR REPLACE FUNCTION save_fingerboard_workout(
    p_protocol VARCHAR(30),
    p_bodyweight_kg NUMERIC,
    p_params JSONB,
    p_duration_seconds INTEGER,
    p_completed BOOLEAN,
    p_notes TEXT,
    p_sets JSONB,
    p_session JSONB DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
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
    v_minutes INTEGER;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_session_id IS NOT NULL THEN
        v_minutes := CASE
            WHEN p_duration_seconds IS NULL THEN 0
            ELSE GREATEST(1, ROUND(p_duration_seconds / 60.0))::INTEGER
        END;

        UPDATE public.sessions s
        SET
            duration_minutes = COALESCE(s.duration_minutes, 0) + v_minutes,
            types = CASE
                WHEN 'hangboard' = ANY(s.types) THEN s.types
                ELSE ARRAY_APPEND(s.types, 'hangboard')
            END,
            notes = CASE
                WHEN COALESCE(p_notes, '') = '' THEN s.notes
                WHEN COALESCE(s.notes, '') = '' THEN p_notes
                ELSE s.notes || E'\n\n' || p_notes
            END
        WHERE s.id = p_session_id
          AND s.user_id = v_user
        RETURNING s.id INTO v_session_id;

        IF v_session_id IS NULL THEN
            RAISE EXCEPTION 'Session % not found', p_session_id;
        END IF;
    ELSIF p_session IS NOT NULL THEN
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
