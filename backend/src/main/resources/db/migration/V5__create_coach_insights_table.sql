CREATE TABLE IF NOT EXISTS coach_insights (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
