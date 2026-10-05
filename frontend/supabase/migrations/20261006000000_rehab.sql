-- The "prehab" session type is renamed "rehab", which is what those sessions are.
-- types is a free TEXT[] with no constraint, so only existing rows need updating.
UPDATE sessions
SET types = array_replace(types, 'prehab', 'rehab')
WHERE 'prehab' = ANY(types);
