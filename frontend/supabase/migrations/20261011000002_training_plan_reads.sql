-- Reads for training plans: the whole plan, this week's bucket, and a week
-- review (PRD D-11). All three return camelCase JSON, shaped for the app and
-- the assistant alike, so neither has to stitch five tables together.
--
-- Archived templates are out of the plan everywhere: they count neither as
-- planned nor as done. Sessions linked to them show up as unplanned in a
-- review. Archiving is for templates that should never have been in the plan;
-- dropping one from coming weeks is done by setting those entries to 0.
--
-- Weeks are counted from the plan's start date. Callers pass today's date
-- rather than relying on current_date, which is UTC and puts a late-evening
-- check on the wrong day.

-- A session can only cross off an item in the week it was done.
CREATE OR REPLACE FUNCTION check_plan_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_session_date DATE;
    v_week_start DATE;
    v_week_index SMALLINT;
BEGIN
    SELECT date INTO v_session_date
    FROM public.sessions
    WHERE id = NEW.session_id;

    SELECT p.start_date + (e.week_index - 1) * 7, e.week_index
    INTO v_week_start, v_week_index
    FROM public.plan_entries e
    JOIN public.training_plans p ON p.id = e.plan_id
    WHERE e.id = NEW.plan_entry_id;

    IF v_session_date IS NULL OR v_week_start IS NULL THEN
        RAISE EXCEPTION 'Session % or plan entry % not found', NEW.session_id, NEW.plan_entry_id;
    END IF;

    IF v_session_date NOT BETWEEN v_week_start AND v_week_start + 6 THEN
        RAISE EXCEPTION 'Session on % is outside week % of its plan (% to %)',
            v_session_date, v_week_index, v_week_start, v_week_start + 6;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER plan_completions_check
    BEFORE INSERT OR UPDATE ON plan_completions
    FOR EACH ROW EXECUTE FUNCTION check_plan_completion();

-- Moving a linked session out of its item's week, or moving a plan's start
-- once sessions are linked to it, would leave links pointing at the wrong
-- week. Both are refused; unlink first.
CREATE OR REPLACE FUNCTION check_session_plan_week()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.plan_completions c
        JOIN public.plan_entries e ON e.id = c.plan_entry_id
        JOIN public.training_plans p ON p.id = e.plan_id
        WHERE c.session_id = NEW.id
          AND NEW.date NOT BETWEEN p.start_date + (e.week_index - 1) * 7
                               AND p.start_date + (e.week_index - 1) * 7 + 6
    ) THEN
        RAISE EXCEPTION 'Session is linked to a planned item in another week; unlink it before moving it to %',
            NEW.date;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_plan_week_check
    BEFORE UPDATE OF date ON sessions
    FOR EACH ROW
    WHEN (OLD.date IS DISTINCT FROM NEW.date)
    EXECUTE FUNCTION check_session_plan_week();

CREATE OR REPLACE FUNCTION check_plan_start_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.plan_completions c
        JOIN public.plan_entries e ON e.id = c.plan_entry_id
        WHERE e.plan_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Plan % has logged sessions; its start date cannot move', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER training_plans_start_date_check
    BEFORE UPDATE OF start_date ON training_plans
    FOR EACH ROW
    WHEN (OLD.start_date IS DISTINCT FROM NEW.start_date)
    EXECUTE FUNCTION check_plan_start_date();

-- One row per planned slot in a week: an entry with count 2 is two slots.
-- Completions fill slots in session order; any beyond the count are ignored.
CREATE OR REPLACE FUNCTION plan_week_items(p_plan_id UUID, p_week_index SMALLINT)
RETURNS TABLE (
    entry_id UUID,
    plan_session_id UUID,
    title TEXT,
    category TEXT,
    description TEXT,
    session_types TEXT[],
    fingerboard_preset JSONB,
    sort_order SMALLINT,
    note TEXT,
    slot INTEGER,
    session_id UUID,
    session_date DATE
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH entries AS (
        SELECT e.id, e.plan_session_id, e.count, e.note,
               s.title, s.category, s.description, s.session_types, s.fingerboard_preset,
               s.sort_order, s.created_at AS session_created_at
        FROM public.plan_entries e
        JOIN public.plan_sessions s ON s.id = e.plan_session_id
        WHERE e.plan_id = p_plan_id
          AND e.week_index = p_week_index
          AND s.archived_at IS NULL
    ), done AS (
        SELECT c.plan_entry_id, c.session_id, ss.date,
               row_number() OVER (
                   PARTITION BY c.plan_entry_id ORDER BY ss.date, c.created_at
               )::INTEGER AS slot
        FROM public.plan_completions c
        JOIN public.sessions ss ON ss.id = c.session_id
        WHERE c.plan_entry_id IN (SELECT id FROM entries)
    )
    SELECT e.id, e.plan_session_id, e.title, e.category, e.description, e.session_types,
           e.fingerboard_preset, e.sort_order, e.note, slots.slot, d.session_id, d.date
    FROM entries e
    CROSS JOIN LATERAL generate_series(1, e.count) AS slots(slot)
    LEFT JOIN done d ON d.plan_entry_id = e.id AND d.slot = slots.slot
    ORDER BY e.sort_order, e.session_created_at, slots.slot;
$$;

-- The whole plan: weeks with planned/done counts, templates with their
-- entries. The active plan when no id is given; NULL when there is none.
CREATE OR REPLACE FUNCTION training_plan(p_plan_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH p AS (
        SELECT *
        FROM public.training_plans
        WHERE CASE WHEN p_plan_id IS NULL THEN archived_at IS NULL ELSE id = p_plan_id END
    ), entries AS (
        SELECT e.*, s.archived_at IS NULL AS active,
               LEAST(e.count, (SELECT count(*) FROM public.plan_completions c
                               WHERE c.plan_entry_id = e.id))::INTEGER AS done
        FROM public.plan_entries e
        JOIN public.plan_sessions s ON s.id = e.plan_session_id
        WHERE e.plan_id = (SELECT id FROM p)
    )
    SELECT jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'goal', p.goal,
        'notes', p.notes,
        'startDate', p.start_date,
        'archived', p.archived_at IS NOT NULL,
        'weeks', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'week', w.week_index,
                'startDate', p.start_date + (w.week_index - 1) * 7,
                'phase', w.phase,
                'focus', w.focus,
                'targetCount', w.target_count,
                'plannedCount', COALESCE((SELECT sum(e.count) FROM entries e
                    WHERE e.week_index = w.week_index AND e.active), 0),
                'doneCount', COALESCE((SELECT sum(e.done) FROM entries e
                    WHERE e.week_index = w.week_index AND e.active), 0)
            ) ORDER BY w.week_index)
            FROM public.plan_weeks w
            WHERE w.plan_id = p.id
        ), '[]'),
        'sessions', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'title', s.title,
                'category', s.category,
                'description', s.description,
                'sessionTypes', to_jsonb(s.session_types),
                'fingerboardPreset', s.fingerboard_preset,
                'sortOrder', s.sort_order,
                'archived', s.archived_at IS NOT NULL,
                'entries', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', e.id,
                        'week', e.week_index,
                        'count', e.count,
                        'note', e.note,
                        'doneCount', e.done
                    ) ORDER BY e.week_index)
                    FROM entries e
                    WHERE e.plan_session_id = s.id
                ), '[]')
            ) ORDER BY s.sort_order, s.created_at)
            FROM public.plan_sessions s
            WHERE s.plan_id = p.id
        ), '[]')
    )
    FROM p;
$$;

-- This week's bucket of the active plan, or NULL when there is no active plan
-- or p_today falls outside it.
CREATE OR REPLACE FUNCTION current_plan_week(p_today DATE)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH p AS (
        SELECT id, title, start_date,
               ((p_today - start_date) / 7 + 1)::SMALLINT AS week_index
        FROM public.training_plans
        WHERE archived_at IS NULL AND p_today >= start_date
    ), w AS (
        SELECT w.*, p.title AS plan_title, p.start_date + (w.week_index - 1) * 7 AS week_start
        FROM public.plan_weeks w
        JOIN p ON p.id = w.plan_id AND w.week_index = p.week_index
    ), items AS (
        SELECT i.*
        FROM w, public.plan_week_items(w.plan_id, w.week_index) i
    )
    SELECT jsonb_build_object(
        'planId', w.plan_id,
        'planTitle', w.plan_title,
        'week', w.week_index,
        'weekCount', (SELECT count(*) FROM public.plan_weeks x WHERE x.plan_id = w.plan_id),
        'startDate', w.week_start,
        'endDate', w.week_start + 6,
        'phase', w.phase,
        'focus', w.focus,
        'targetCount', w.target_count,
        'plannedCount', (SELECT count(*) FROM items),
        'doneCount', (SELECT count(*) FROM items WHERE session_id IS NOT NULL),
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'entryId', i.entry_id,
                'planSessionId', i.plan_session_id,
                'title', i.title,
                'category', i.category,
                'description', i.description,
                'sessionTypes', to_jsonb(i.session_types),
                'fingerboardPreset', i.fingerboard_preset,
                'note', i.note,
                'slot', i.slot,
                'sessionId', i.session_id,
                'sessionDate', i.session_date
            ) ORDER BY i.sort_order, i.slot)
            FROM items i
        ), '[]')
    )
    FROM w;
$$;

-- A fixed-shape summary of one plan week (PRD D-11). It reports what was done
-- and does not judge it. A session with two types counts under both in
-- byType. NULL when the plan has no such week.
CREATE OR REPLACE FUNCTION plan_week_review(p_plan_id UUID, p_week_index SMALLINT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH w AS (
        SELECT w.*, p.title AS plan_title, p.start_date + (w.week_index - 1) * 7 AS week_start
        FROM public.plan_weeks w
        JOIN public.training_plans p ON p.id = w.plan_id
        WHERE w.plan_id = p_plan_id AND w.week_index = p_week_index
    ), items AS (
        SELECT * FROM public.plan_week_items(p_plan_id, p_week_index)
    ), week_sessions AS (
        SELECT s.*
        FROM public.sessions s, w
        WHERE s.date BETWEEN w.week_start AND w.week_start + 6
    ), summary AS (
        SELECT s.id, jsonb_build_object(
            'id', s.id,
            'date', s.date,
            'types', to_jsonb(s.types),
            'durationMinutes', s.duration_minutes,
            'intensity', s.intensity,
            'performance', s.performance,
            'notes', s.notes
        ) AS json
        FROM week_sessions s
    )
    SELECT jsonb_build_object(
        'planId', w.plan_id,
        'planTitle', w.plan_title,
        'week', w.week_index,
        'startDate', w.week_start,
        'endDate', w.week_start + 6,
        'phase', w.phase,
        'focus', w.focus,
        'targetCount', w.target_count,
        'plannedCount', (SELECT count(*) FROM items),
        'doneCount', (SELECT count(*) FROM items WHERE session_id IS NOT NULL),
        'targetMet', (SELECT count(*) FILTER (WHERE session_id IS NOT NULL)
                             >= COALESCE(w.target_count, count(*))
                      FROM items),
        'completed', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'title', i.title,
                'category', i.category,
                'note', i.note,
                'session', sm.json
            ) ORDER BY i.session_date, i.sort_order)
            FROM items i
            JOIN summary sm ON sm.id = i.session_id
        ), '[]'),
        'missed', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'title', i.title,
                'category', i.category,
                'note', i.note
            ) ORDER BY i.sort_order, i.slot)
            FROM items i
            WHERE i.session_id IS NULL
        ), '[]'),
        'unplanned', COALESCE((
            SELECT jsonb_agg(sm.json ORDER BY sm.json ->> 'date')
            FROM summary sm
            WHERE sm.id NOT IN (SELECT session_id FROM items WHERE session_id IS NOT NULL)
        ), '[]'),
        'byType', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'type', t.type,
                'sessions', t.sessions,
                'minutes', t.minutes
            ) ORDER BY t.sessions DESC, t.type)
            FROM (
                SELECT type, count(*) AS sessions, COALESCE(sum(s.duration_minutes), 0) AS minutes
                FROM week_sessions s, unnest(s.types) AS type
                GROUP BY type
            ) t
        ), '[]'),
        'byCategory', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'category', c.category,
                'plannedCount', c.planned,
                'doneCount', c.done
            ) ORDER BY c.category)
            FROM (
                SELECT category, count(*) AS planned, count(session_id) AS done
                FROM items
                GROUP BY category
            ) c
        ), '[]'),
        'fingerboard', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'date', f.date,
                'protocol', f.protocol,
                'completed', f.completed,
                'grips', f.grips
            ) ORDER BY f.date)
            FROM (
                SELECT COALESCE(s.date, fw.performed_at::DATE) AS date, fw.protocol, fw.completed,
                       (SELECT jsonb_agg(DISTINCT fs.grip || ' ' || fs.edge_mm || ' mm')
                        FROM public.fingerboard_sets fs WHERE fs.workout_id = fw.id) AS grips
                FROM public.fingerboard_workouts fw
                LEFT JOIN public.sessions s ON s.id = fw.session_id
                WHERE COALESCE(s.date, fw.performed_at::DATE)
                      BETWEEN w.week_start AND w.week_start + 6
            ) f
        ), '[]'),
        'injuries', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'date', s.date,
                'location', si.location,
                'severity', si.severity,
                'note', si.note
            ) ORDER BY s.date)
            FROM public.session_injuries si
            JOIN week_sessions s ON s.id = si.session_id
        ), '[]')
    )
    FROM w;
$$;
