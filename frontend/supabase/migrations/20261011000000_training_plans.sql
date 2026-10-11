-- Training plans: a run of weeks, each holding a bucket of planned sessions
-- with no day attached. See tasks/prd-training-plans.md.
--
-- The grid is templates (plan_sessions) × weeks (plan_weeks), and a cell
-- (plan_entries) says how many times a template is planned that week. A logged
-- session crosses entries off through plan_completions.
--
-- Entries carry plan_id so composite foreign keys can check that an entry's
-- template and week belong to the same plan. That is what rejects an entry for
-- week 9 of an 8-week plan, without a trigger.

CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal TEXT,
    notes TEXT,
    start_date DATE NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT training_plans_start_monday_check
        CHECK (extract(isodow FROM start_date) = 1)
);

-- At most one active plan per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_plans_one_active
    ON training_plans(user_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS plan_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    week_index SMALLINT NOT NULL,
    phase TEXT NOT NULL,
    target_count SMALLINT,
    focus TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plan_weeks_plan_week_key UNIQUE (plan_id, week_index),
    CONSTRAINT plan_weeks_week_index_check
        CHECK (week_index BETWEEN 1 AND 52),
    CONSTRAINT plan_weeks_phase_check
        CHECK (phase IN ('volume', 'strength', 'endurance', 'performance', 'recovery')),
    CONSTRAINT plan_weeks_target_count_check
        CHECK (target_count IS NULL OR target_count > 0)
);

CREATE TABLE IF NOT EXISTS plan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    session_types TEXT[] NOT NULL DEFAULT '{}',
    fingerboard_preset JSONB,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plan_sessions_id_plan_key UNIQUE (id, plan_id),
    CONSTRAINT plan_sessions_category_check
        CHECK (category IN ('strength', 'power', 'endurance', 'climbing', 'mobility', 'other'))
);

CREATE TABLE IF NOT EXISTS plan_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,
    plan_session_id UUID NOT NULL,
    week_index SMALLINT NOT NULL,
    count SMALLINT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plan_entries_session_week_key UNIQUE (plan_session_id, week_index),
    CONSTRAINT plan_entries_session_fkey FOREIGN KEY (plan_session_id, plan_id)
        REFERENCES plan_sessions(id, plan_id) ON DELETE CASCADE,
    CONSTRAINT plan_entries_week_fkey FOREIGN KEY (plan_id, week_index)
        REFERENCES plan_weeks(plan_id, week_index) ON DELETE CASCADE,
    CONSTRAINT plan_entries_count_check CHECK (count > 0)
);

CREATE TABLE IF NOT EXISTS plan_completions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    plan_entry_id UUID NOT NULL REFERENCES plan_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, plan_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_training_plans_user_id ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_weeks_user_id ON plan_weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_user_id ON plan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_plan_id ON plan_sessions(plan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_plan_entries_user_id ON plan_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_entries_plan_week ON plan_entries(plan_id, week_index);
CREATE INDEX IF NOT EXISTS idx_plan_completions_user_id ON plan_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_completions_entry_id ON plan_completions(plan_entry_id);

CREATE TRIGGER training_plans_updated_at
    BEFORE UPDATE ON training_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plan_weeks_updated_at
    BEFORE UPDATE ON plan_weeks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plan_sessions_updated_at
    BEFORE UPDATE ON plan_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plan_entries_updated_at
    BEFORE UPDATE ON plan_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own training plans"
    ON training_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training plans"
    ON training_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training plans"
    ON training_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training plans"
    ON training_plans FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select own plan weeks"
    ON plan_weeks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan weeks"
    ON plan_weeks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan weeks"
    ON plan_weeks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan weeks"
    ON plan_weeks FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select own plan sessions"
    ON plan_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan sessions"
    ON plan_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan sessions"
    ON plan_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan sessions"
    ON plan_sessions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select own plan entries"
    ON plan_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan entries"
    ON plan_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan entries"
    ON plan_entries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan entries"
    ON plan_entries FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can select own plan completions"
    ON plan_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan completions"
    ON plan_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan completions"
    ON plan_completions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan completions"
    ON plan_completions FOR DELETE
    USING (auth.uid() = user_id);
