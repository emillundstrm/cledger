-- Enable Row Level Security on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can select own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Session injuries policies
CREATE POLICY "Users can select own injuries"
    ON session_injuries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own injuries"
    ON session_injuries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own injuries"
    ON session_injuries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own injuries"
    ON session_injuries FOR DELETE
    USING (auth.uid() = user_id);

-- Coach insights policies
CREATE POLICY "Users can select own insights"
    ON coach_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
    ON coach_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
    ON coach_insights FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
    ON coach_insights FOR DELETE
    USING (auth.uid() = user_id);
