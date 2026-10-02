-- Notes: the assistant's (and the user's) durable memory. Replaces coach_insights.
--
-- Tags are free-form. The tag 'assistant' is reserved for rules about how the
-- assistant should behave; get_context always loads those in full.
--
-- title is required by the app and the MCP server, but nullable here so that
-- migrated insights, which have no title, can be curated by hand afterwards.

-- pg_trgm powers search(). Search scans the user's notes rather than using a
-- trigram index: per-word word_similarity cannot use one, and one person's
-- notes are far too few for it to matter.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'user',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notes_source_check
        CHECK (source IN ('user', 'assistant'))
);

-- Previous versions of a note, written by trigger on every edit of title,
-- content or tags. created_at is when that version was replaced.
CREATE TABLE IF NOT EXISTS note_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
    ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags
    ON notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_note_revisions_note
    ON note_revisions(note_id, created_at DESC);

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION record_note_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF OLD.title IS DISTINCT FROM NEW.title
        OR OLD.content IS DISTINCT FROM NEW.content
        OR OLD.tags IS DISTINCT FROM NEW.tags THEN
        INSERT INTO note_revisions (user_id, note_id, title, content, tags)
        VALUES (OLD.user_id, OLD.id, OLD.title, OLD.content, OLD.tags);
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER notes_record_revision
    AFTER UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION record_note_revision();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Revisions are append-only: no UPDATE or DELETE policy. They disappear only
-- when their note is deleted (ON DELETE CASCADE).
CREATE POLICY "Users can select own note revisions"
    ON note_revisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note revisions"
    ON note_revisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Move insights over unchanged, keeping their ids. Translation, titles and
-- splitting happen in a later, interactive curation pass.
INSERT INTO notes (id, user_id, content, tags, pinned, source, created_at, updated_at)
SELECT id, user_id, content, '{training}', pinned, 'assistant', created_at, updated_at
FROM coach_insights;

DROP TABLE coach_insights;

-- Tags in use, most used first. Archived notes do not count.
CREATE OR REPLACE FUNCTION note_tags()
RETURNS TABLE (tag TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT t.tag, count(*) AS count
    FROM notes n, unnest(n.tags) AS t(tag)
    WHERE n.user_id = auth.uid()
      AND n.archived_at IS NULL
    GROUP BY t.tag
    ORDER BY count DESC, t.tag;
$$;
