-- Journal: diary entries. Several per day are normal. entry_date is the day
-- the entry is about; clients send it explicitly, because current_date is
-- UTC and a late-evening entry would otherwise land on the wrong day.

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT current_date,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    mood SMALLINT,
    energy SMALLINT,
    source TEXT NOT NULL DEFAULT 'user',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT journal_entries_mood_check
        CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
    CONSTRAINT journal_entries_energy_check
        CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
    CONSTRAINT journal_entries_source_check
        CHECK (source IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
    ON journal_entries(user_id, entry_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags
    ON journal_entries USING GIN (tags);

CREATE TRIGGER journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own journal entries"
    ON journal_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
    ON journal_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
    ON journal_entries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
    ON journal_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Search now covers journal entries too. Entries have no title; their date is
-- entry_date, the day they are about.
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
