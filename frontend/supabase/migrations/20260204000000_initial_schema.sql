-- Sessions table with user_id and types as text array
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    types TEXT[] NOT NULL DEFAULT '{}',
    intensity VARCHAR(20) NOT NULL,
    performance VARCHAR(20) NOT NULL,
    productivity VARCHAR(20) NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    max_grade VARCHAR(20),
    venue VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session injuries table with user_id
CREATE TABLE IF NOT EXISTS session_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    location VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach insights table with user_id
CREATE TABLE IF NOT EXISTS coach_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_session_injuries_user_id ON session_injuries(user_id);
CREATE INDEX IF NOT EXISTS idx_session_injuries_session_id ON session_injuries(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_insights_user_id ON coach_insights(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Auto-update updated_at on all tables
CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER session_injuries_updated_at
    BEFORE UPDATE ON session_injuries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER coach_insights_updated_at
    BEFORE UPDATE ON coach_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
