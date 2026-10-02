-- Tasks: todo lists. A list is just a name on the task, not a table.

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list TEXT NOT NULL DEFAULT 'inbox',
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'user',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tasks_status_check
        CHECK (status IN ('open', 'done')),
    CONSTRAINT tasks_source_check
        CHECK (source IN ('user', 'assistant')),
    CONSTRAINT tasks_list_check
        CHECK (list <> '')
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
    ON tasks(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_list
    ON tasks(user_id, list);

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- completed_at follows status, so clients only ever set status.
CREATE OR REPLACE FUNCTION sync_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
        NEW.completed_at = now();
    ELSIF NEW.status = 'open' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_sync_completed_at
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION sync_task_completed_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- Lists in use with their open task counts. Archived tasks do not count.
CREATE OR REPLACE FUNCTION task_lists()
RETURNS TABLE (list TEXT, open_count BIGINT, total_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT
        t.list,
        count(*) FILTER (WHERE t.status = 'open') AS open_count,
        count(*) AS total_count
    FROM tasks t
    WHERE t.user_id = auth.uid()
      AND t.archived_at IS NULL
    GROUP BY t.list
    ORDER BY (t.list = 'inbox') DESC, t.list;
$$;

-- Search now covers tasks as well as notes. See 20261002000001_search.sql
-- for how matching and scoring work. Tasks have no tags; their list name is
-- returned in tags instead, so results still say where a task lives.
CREATE OR REPLACE FUNCTION search(
    p_query TEXT,
    p_kinds TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    kind TEXT,
    id UUID,
    title TEXT,
    snippet TEXT,
    date TIMESTAMPTZ,
    tags TEXT[],
    score REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
    WITH q AS (
        SELECT array_agg(w) AS words
        FROM regexp_split_to_table(lower(trim(p_query)), '\s+') AS w
        WHERE w <> ''
    ), docs AS (
        SELECT
            'note'::TEXT AS kind,
            n.id,
            n.title,
            n.content AS body,
            n.updated_at AS date,
            n.tags,
            coalesce(n.title, '') || ' ' || n.content || ' ' || array_to_string(n.tags, ' ') AS haystack
        FROM notes n
        WHERE n.user_id = auth.uid()
          AND (p_include_archived OR n.archived_at IS NULL)
          AND (p_kinds IS NULL OR 'note' = ANY(p_kinds))
        UNION ALL
        SELECT
            'task'::TEXT,
            t.id,
            t.title,
            coalesce(t.notes, t.title),
            t.updated_at,
            ARRAY[t.list],
            t.title || ' ' || coalesce(t.notes, '') || ' ' || t.list
        FROM tasks t
        WHERE t.user_id = auth.uid()
          AND (p_include_archived OR t.archived_at IS NULL)
          AND (p_kinds IS NULL OR 'task' = ANY(p_kinds))
    ), scored AS (
        SELECT
            d.*,
            (
                SELECT coalesce(sum(s), 0)
                FROM (
                    SELECT word_similarity(w, d.haystack) AS s
                    FROM unnest(q.words) AS w
                ) m
                WHERE s >= 0.5
            ) / cardinality(q.words) AS score
        FROM docs d, q
        WHERE cardinality(q.words) > 0
    )
    SELECT
        s.kind,
        s.id,
        s.title,
        search_snippet(s.body, (SELECT words FROM q)),
        s.date,
        s.tags,
        s.score::REAL
    FROM scored s
    WHERE s.score > 0
    ORDER BY s.score DESC, s.date DESC
    LIMIT p_limit;
$$;
