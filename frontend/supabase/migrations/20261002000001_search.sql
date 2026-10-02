-- One search across everything the assistant can remember. Notes only for now;
-- tasks and journal entries are added to the docs CTE as those tables arrive.
--
-- Content is mostly Swedish with English climbing terms mixed in, so no
-- language-specific stemming: each query word is matched by trigram
-- word_similarity, which catches inflections and compounds
-- ('klättring' ~ 'klättrade', 'sömn' ~ 'sömnkvalitet') in either language.
-- A document's score is the mean over query words of its best match, so
-- documents matching more of the query rank higher. Words matching below
-- 0.5 count as no match; below that, unrelated words start to pass.

-- A ~200 character window around the first query word found in the text,
-- falling back to the start of the text.
CREATE OR REPLACE FUNCTION search_snippet(p_body TEXT, p_words TEXT[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    WITH flat AS (
        SELECT regexp_replace(p_body, '\s+', ' ', 'g') AS body
    ), hit AS (
        SELECT min(nullif(strpos(lower(flat.body), w), 0)) AS pos
        FROM flat, unnest(p_words) AS w
    )
    SELECT CASE
        WHEN hit.pos IS NULL OR hit.pos <= 60 THEN left(flat.body, 200)
        ELSE '…' || substr(flat.body, hit.pos - 60, 200)
    END
    FROM flat, hit;
$$;

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
