-- Drop the old pain flags table
DROP TABLE IF EXISTS session_pain_flags;

-- Create the new session_injuries table
CREATE TABLE session_injuries (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    location VARCHAR(255) NOT NULL,
    note TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
