-- Running sessions: a distance, and the Garmin activity a session came from.
--
-- Runs are recorded in Garmin; a copy lives here so load and the plan see
-- them alongside climbing. The type itself needs no schema: `types` is free
-- TEXT[] and 'running' is just a new value.
--
-- `distance_km` is meant for runs, but is not tied to the type in the schema:
-- the form hides it for other types, and refusing a type change because an old
-- distance is set would be baffling.
--
-- `garmin_activity_id` is the activity's id in Garmin Connect, set by the
-- assistant when it copies an activity over, and never shown. It is TEXT
-- because it is an identifier, not a number to count with. One session per
-- activity, so an import can tell what it has already copied.

ALTER TABLE sessions
    ADD COLUMN distance_km NUMERIC(6, 2) CHECK (distance_km > 0),
    ADD COLUMN garmin_activity_id TEXT CHECK (garmin_activity_id <> '');

CREATE UNIQUE INDEX sessions_garmin_activity_key
    ON sessions (user_id, garmin_activity_id)
    WHERE garmin_activity_id IS NOT NULL;
