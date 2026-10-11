-- Moving a linked session to another week now unlinks it from the old week's
-- items, instead of refusing the move.
--
-- Refusing made sense for the assistant, but in the session form moving a
-- session to another day is ordinary editing: the form shows the new week's
-- items to pick from, and an error for a date change would be baffling. The
-- old week's item reopens, which is what moving the session means.

DROP TRIGGER IF EXISTS sessions_plan_week_check ON sessions;
DROP FUNCTION IF EXISTS check_session_plan_week();

CREATE OR REPLACE FUNCTION unlink_moved_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.plan_completions c
    USING public.plan_entries e, public.training_plans p
    WHERE c.session_id = NEW.id
      AND e.id = c.plan_entry_id
      AND p.id = e.plan_id
      AND NEW.date NOT BETWEEN p.start_date + (e.week_index - 1) * 7
                           AND p.start_date + (e.week_index - 1) * 7 + 6;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_unlink_moved
    AFTER UPDATE OF date ON sessions
    FOR EACH ROW
    WHEN (OLD.date IS DISTINCT FROM NEW.date)
    EXECUTE FUNCTION unlink_moved_session();
