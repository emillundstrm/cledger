CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    intensity VARCHAR(20) NOT NULL,
    performance VARCHAR(20) NOT NULL,
    productivity VARCHAR(20) NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    max_grade VARCHAR(20),
    hard_attempts INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE session_types (
    session_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    PRIMARY KEY (session_id, type),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE session_pain_flags (
    session_id UUID NOT NULL,
    location VARCHAR(20) NOT NULL,
    PRIMARY KEY (session_id, location),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
