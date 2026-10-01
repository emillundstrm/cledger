-- A set is a set, however many hands worked it.
--
-- last_fingerboard_workout() counted DISTINCT set_index, and the save path
-- numbered every row: an alternating set wrote two rows with two different
-- indices, so a 20 set Abralifts circuit came back as 40 and a 10 set half
-- came back as a full 20. That count is the next workout's default shape, so
-- the volume doubled every time the previous session was reused.
--
-- The save path now numbers per set rather than per row, but rows already
-- written keep their old numbering. Counting rows and dividing by the hands
-- worked is right for both: two rows per set over two hands, one over one.
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
            -- A part-finished set still counts as one, hence the round up.
            CEIL(COUNT(*)::NUMERIC / COUNT(DISTINCT s.hand))::INTEGER AS sets,
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
