-- Checklists replace tasks. A list is now a note containing Markdown task
-- lines ("- [ ] kaffe"), so a shopping list or the steps of a goal is one note
-- rather than many separate tasks. See D-12 in tasks/prd-assistant-companion.md.

-- 1. Convert each user's unarchived tasks into one note per list: open items
--    first in due-date order, then done ones. Due dates and task notes are
--    kept in the item text, since items have no fields of their own.
INSERT INTO notes (user_id, title, content, tags, source)
SELECT
    t.user_id,
    upper(left(t.list, 1)) || substr(t.list, 2),
    string_agg(
        '- [' || CASE WHEN t.status = 'done' THEN 'x' ELSE ' ' END || '] '
            || regexp_replace(t.title, '\s+', ' ', 'g')
            || CASE WHEN t.due_date IS NOT NULL THEN ' (senast ' || t.due_date || ')' ELSE '' END
            || CASE WHEN t.notes IS NOT NULL AND trim(t.notes) <> ''
                    THEN ' — ' || regexp_replace(trim(t.notes), '\s+', ' ', 'g')
                    ELSE '' END,
        E'\n'
        ORDER BY (t.status = 'done'), t.due_date NULLS LAST, t.created_at
    ),
    '{}',
    CASE WHEN bool_and(t.source = 'assistant') THEN 'assistant' ELSE 'user' END
FROM tasks t
WHERE t.archived_at IS NULL
GROUP BY t.user_id, t.list;

-- 2. Retire tasks.
DROP FUNCTION IF EXISTS task_lists();
DROP TABLE tasks;
DROP FUNCTION IF EXISTS sync_task_completed_at();

-- 3. Ticking, adding and reordering checklist items is not an edit worth a
--    revision; otherwise a shopping trip would bury the real history. Only
--    changes to the title, tags or the note's other lines are recorded.
CREATE OR REPLACE FUNCTION strip_checklist_items(p_content TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT regexp_replace(p_content, '^[ \t]*[-*+] \[[ xX]\] [^\n]*\n?', '', 'gn');
$$;

CREATE OR REPLACE FUNCTION record_note_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF OLD.title IS DISTINCT FROM NEW.title
        OR OLD.tags IS DISTINCT FROM NEW.tags
        OR strip_checklist_items(OLD.content) IS DISTINCT FROM strip_checklist_items(NEW.content) THEN
        INSERT INTO note_revisions (user_id, note_id, title, content, tags)
        VALUES (OLD.user_id, OLD.id, OLD.title, OLD.content, OLD.tags);
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Search covers notes and journal entries. Checklist items are found
--    through the notes that hold them.
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
            'journal'::TEXT,
            j.id,
            NULL::TEXT,
            j.content,
            j.entry_date::TIMESTAMPTZ,
            j.tags,
            j.content || ' ' || array_to_string(j.tags, ' ')
        FROM journal_entries j
        WHERE j.user_id = auth.uid()
          AND (p_include_archived OR j.archived_at IS NULL)
          AND (p_kinds IS NULL OR 'journal' = ANY(p_kinds))
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
