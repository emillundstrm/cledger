-- Writes a training plan as one transaction (PRD D-12). The assistant builds a
-- whole plan in one tool call; doing it cell by cell would take dozens of
-- calls and leave half-built plans behind on failure.
--
-- Input is camelCase JSON, nested so the caller never needs ids for new rows:
--
--   {
--     "title": "...", "goal": "...", "notes": "...", "startDate": "2026-10-12",
--     "weeks": [{"week": 1, "phase": "volume", "targetCount": 5, "focus": "..."}],
--     "sessions": [{
--       "id": "<existing, patch only>",
--       "title": "...", "category": "strength", "description": "...",
--       "sessionTypes": ["board"], "fingerboardPreset": {...},
--       "sortOrder": 0, "archived": false,
--       "entries": [{"week": 1, "count": 2, "note": "..."}]
--     }]
--   }
--
-- A patch changes only the keys it names, so a null value clears a field and a
-- missing key leaves it alone. Weeks are matched by number and entries by
-- (template, week); an entry with count 0 is removed. Invalid input anywhere
-- (unknown phase, a week outside the plan, gaps in the weeks) fails the call
-- and nothing is written.

CREATE OR REPLACE FUNCTION update_training_plan(p_plan_id UUID, p_patch JSONB)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_archived_at TIMESTAMPTZ;
    v_week JSONB;
    v_week_index SMALLINT;
    v_session JSONB;
    v_session_id UUID;
    v_entry JSONB;
    v_count SMALLINT;
    v_done BIGINT;
    v_week_rows BIGINT;
    v_week_max SMALLINT;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT archived_at INTO v_archived_at
    FROM public.training_plans
    WHERE id = p_plan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Training plan % not found', p_plan_id;
    END IF;
    IF v_archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'Training plan % is archived', p_plan_id;
    END IF;

    UPDATE public.training_plans SET
        title = CASE WHEN p_patch ? 'title' THEN p_patch ->> 'title' ELSE title END,
        goal = CASE WHEN p_patch ? 'goal' THEN p_patch ->> 'goal' ELSE goal END,
        notes = CASE WHEN p_patch ? 'notes' THEN p_patch ->> 'notes' ELSE notes END,
        start_date = CASE WHEN p_patch ? 'startDate'
            THEN (p_patch ->> 'startDate')::DATE ELSE start_date END
    WHERE id = p_plan_id
      AND (p_patch ?| ARRAY['title', 'goal', 'notes', 'startDate']);

    -- Weeks first, so entries below can reference new ones. Update-then-insert
    -- rather than ON CONFLICT: a patch that only changes the focus has no phase,
    -- and the NOT NULL check would fire on the proposed insert row.
    FOR v_week IN SELECT * FROM jsonb_array_elements(COALESCE(p_patch -> 'weeks', '[]'))
    LOOP
        v_week_index := (v_week ->> 'week')::SMALLINT;
        IF v_week_index IS NULL THEN
            RAISE EXCEPTION 'Every week needs a "week" number';
        END IF;

        UPDATE public.plan_weeks SET
            phase = CASE WHEN v_week ? 'phase' THEN v_week ->> 'phase' ELSE phase END,
            target_count = CASE WHEN v_week ? 'targetCount'
                THEN (v_week ->> 'targetCount')::SMALLINT ELSE target_count END,
            focus = CASE WHEN v_week ? 'focus' THEN v_week ->> 'focus' ELSE focus END
        WHERE plan_id = p_plan_id AND week_index = v_week_index;

        IF NOT FOUND THEN
            INSERT INTO public.plan_weeks (user_id, plan_id, week_index, phase, target_count, focus)
            VALUES (
                v_user,
                p_plan_id,
                v_week_index,
                v_week ->> 'phase',
                (v_week ->> 'targetCount')::SMALLINT,
                v_week ->> 'focus'
            );
        END IF;
    END LOOP;

    SELECT count(*), max(week_index) INTO v_week_rows, v_week_max
    FROM public.plan_weeks
    WHERE plan_id = p_plan_id;

    IF v_week_rows = 0 OR v_week_rows <> v_week_max THEN
        RAISE EXCEPTION 'A plan''s weeks must run 1..n without gaps';
    END IF;

    FOR v_session IN SELECT * FROM jsonb_array_elements(COALESCE(p_patch -> 'sessions', '[]'))
    LOOP
        IF v_session ? 'id' THEN
            v_session_id := (v_session ->> 'id')::UUID;

            UPDATE public.plan_sessions SET
                title = CASE WHEN v_session ? 'title' THEN v_session ->> 'title' ELSE title END,
                category = CASE WHEN v_session ? 'category'
                    THEN v_session ->> 'category' ELSE category END,
                description = CASE WHEN v_session ? 'description'
                    THEN v_session ->> 'description' ELSE description END,
                session_types = CASE WHEN v_session ? 'sessionTypes'
                    THEN ARRAY(SELECT jsonb_array_elements_text(
                        COALESCE(v_session -> 'sessionTypes', '[]')))
                    ELSE session_types END,
                fingerboard_preset = CASE WHEN v_session ? 'fingerboardPreset'
                    THEN NULLIF(v_session -> 'fingerboardPreset', 'null')
                    ELSE fingerboard_preset END,
                sort_order = CASE WHEN v_session ? 'sortOrder'
                    THEN (v_session ->> 'sortOrder')::SMALLINT ELSE sort_order END,
                archived_at = CASE WHEN v_session ? 'archived'
                    THEN CASE WHEN (v_session ->> 'archived')::BOOLEAN
                        THEN COALESCE(archived_at, now()) END
                    ELSE archived_at END
            WHERE id = v_session_id AND plan_id = p_plan_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Plan session % not found in plan %', v_session_id, p_plan_id;
            END IF;
        ELSE
            INSERT INTO public.plan_sessions (
                user_id, plan_id, title, category, description,
                session_types, fingerboard_preset, sort_order
            )
            VALUES (
                v_user,
                p_plan_id,
                v_session ->> 'title',
                v_session ->> 'category',
                v_session ->> 'description',
                ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_session -> 'sessionTypes', '[]'))),
                NULLIF(v_session -> 'fingerboardPreset', 'null'),
                COALESCE(
                    (v_session ->> 'sortOrder')::SMALLINT,
                    (SELECT COALESCE(max(sort_order) + 1, 0)
                     FROM public.plan_sessions WHERE plan_id = p_plan_id)
                )
            )
            RETURNING id INTO v_session_id;
        END IF;

        FOR v_entry IN SELECT * FROM jsonb_array_elements(COALESCE(v_session -> 'entries', '[]'))
        LOOP
            v_week_index := (v_entry ->> 'week')::SMALLINT;
            v_count := COALESCE((v_entry ->> 'count')::SMALLINT, 1);

            -- Lowering a count must not silently undo sessions already logged
            -- against it; those links are the user's record, not the plan's.
            SELECT count(*) INTO v_done
            FROM public.plan_completions c
            JOIN public.plan_entries e ON e.id = c.plan_entry_id
            WHERE e.plan_session_id = v_session_id AND e.week_index = v_week_index;

            IF v_done > v_count THEN
                RAISE EXCEPTION 'Week % of plan session % already has % logged session(s)',
                    v_week_index, v_session_id, v_done;
            END IF;

            IF v_count = 0 THEN
                DELETE FROM public.plan_entries
                WHERE plan_session_id = v_session_id AND week_index = v_week_index;
            ELSE
                INSERT INTO public.plan_entries (
                    user_id, plan_id, plan_session_id, week_index, count, note
                )
                VALUES (v_user, p_plan_id, v_session_id, v_week_index, v_count, v_entry ->> 'note')
                ON CONFLICT (plan_session_id, week_index) DO UPDATE SET
                    count = EXCLUDED.count,
                    note = CASE WHEN v_entry ? 'note' THEN EXCLUDED.note ELSE public.plan_entries.note END;
            END IF;
        END LOOP;
    END LOOP;

    RETURN p_plan_id;
END;
$$;

-- Creates a plan from the same JSON shape and makes it the active one; any
-- previously active plan is archived (PRD D-9). If the new plan is invalid the
-- whole call rolls back, so the old plan stays active.
CREATE OR REPLACE FUNCTION create_training_plan(p_plan JSONB)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_plan_id UUID;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.training_plans
    SET archived_at = now()
    WHERE user_id = v_user AND archived_at IS NULL;

    INSERT INTO public.training_plans (user_id, title, goal, notes, start_date)
    VALUES (
        v_user,
        p_plan ->> 'title',
        p_plan ->> 'goal',
        p_plan ->> 'notes',
        (p_plan ->> 'startDate')::DATE
    )
    RETURNING id INTO v_plan_id;

    PERFORM public.update_training_plan(
        v_plan_id,
        jsonb_build_object(
            'weeks', COALESCE(p_plan -> 'weeks', '[]'),
            'sessions', COALESCE(p_plan -> 'sessions', '[]')
        )
    );

    RETURN v_plan_id;
END;
$$;
