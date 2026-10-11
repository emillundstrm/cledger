BEGIN;
SELECT plan(18);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local');

INSERT INTO sessions (id, user_id, date, types, intensity, performance, duration_minutes) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     '2026-10-13', '{board}', 8, 'normal', 90),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
     '2026-10-15', '{boulder,strength}', 7, 'strong', 120),
    ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a',
     '2026-10-14', '{other}', 5, 'normal', 40),
    ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a',
     '2026-10-20', '{boulder}', 6, 'normal', 60);

INSERT INTO session_injuries (user_id, session_id, location, severity) VALUES
    ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 'finger', 1);

INSERT INTO fingerboard_workouts (id, user_id, session_id, protocol, completed) VALUES
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     '50000000-0000-0000-0000-000000000001', 'repeaters', true);
INSERT INTO fingerboard_sets (user_id, workout_id, set_index, grip, edge_mm, hand, mode, total_load_kg)
VALUES ('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001',
        1, 'half_crimp', 20, 'both', 'hang', 80);

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

CREATE TEMP TABLE ids (name TEXT PRIMARY KEY, id UUID);

INSERT INTO ids VALUES ('plan', create_training_plan($${
    "title": "Höstblock",
    "startDate": "2026-10-12",
    "weeks": [{"week": 1, "phase": "strength"}, {"week": 2, "phase": "volume", "targetCount": 1}],
    "sessions": [
        {"title": "Moonboard", "category": "strength", "entries": [{"week": 1, "count": 2}]},
        {"title": "Löpning", "category": "endurance", "entries": [{"week": 1}, {"week": 2}]},
        {"title": "Fel pass", "category": "other", "entries": [{"week": 1}]}
    ]
}$$::JSONB));

INSERT INTO ids SELECT 'moon_w1', e.id FROM plan_entries e
JOIN plan_sessions s ON s.id = e.plan_session_id WHERE s.title = 'Moonboard';
INSERT INTO ids SELECT 'run_w1', e.id FROM plan_entries e
JOIN plan_sessions s ON s.id = e.plan_session_id WHERE s.title = 'Löpning' AND e.week_index = 1;

UPDATE plan_sessions SET archived_at = now() WHERE title = 'Fel pass';

INSERT INTO plan_completions (user_id, session_id, plan_entry_id) VALUES
    ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001',
     (SELECT id FROM ids WHERE name = 'moon_w1')),
    ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000003',
     (SELECT id FROM ids WHERE name = 'run_w1'));

-- Current week.

SELECT is(
    current_plan_week('2026-10-14') ->> 'week',
    '1',
    'The current week is counted from the start date'
);

SELECT is(
    (current_plan_week('2026-10-18') ->> 'plannedCount') || '/' || (current_plan_week('2026-10-18') ->> 'doneCount'),
    '3/2',
    'A count of 2 is two slots, and archived templates are left out'
);

SELECT is(
    (SELECT count(*) FROM jsonb_array_elements(current_plan_week('2026-10-14') -> 'items') i
     WHERE i ->> 'title' = 'Moonboard' AND i ->> 'sessionId' IS NULL),
    1::BIGINT,
    'The second Moonboard slot is still open'
);

SELECT is(current_plan_week('2026-10-11'), NULL, 'No current week before the plan starts');
SELECT is(current_plan_week('2026-10-26'), NULL, 'No current week after the plan ends');

-- Links stay in their week.

SELECT throws_like(
    format($$INSERT INTO plan_completions (user_id, session_id, plan_entry_id)
             VALUES ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000004', %L)$$,
        (SELECT id FROM ids WHERE name = 'moon_w1')),
    '%outside week 1%',
    'A session cannot cross off an item in another week'
);

UPDATE sessions SET date = '2026-10-12' WHERE id = '50000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT count(*) FROM plan_completions WHERE session_id = '50000000-0000-0000-0000-000000000001'),
    1::BIGINT,
    'A session moved within its week stays linked'
);

SELECT throws_like(
    format($$SELECT update_training_plan(%L, '{"startDate": "2026-10-19"}')$$,
        (SELECT id FROM ids WHERE name = 'plan')),
    '%start date cannot move%',
    'A plan with logged sessions keeps its start date'
);

-- Extra completions beyond an entry's count are ignored.
INSERT INTO plan_completions (user_id, session_id, plan_entry_id) VALUES
    ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002',
     (SELECT id FROM ids WHERE name = 'run_w1'));
SELECT is(
    current_plan_week('2026-10-14') ->> 'doneCount',
    '2',
    'Completions beyond a count do not add to done'
);
DELETE FROM plan_completions WHERE session_id = '50000000-0000-0000-0000-000000000002';

-- Whole plan.

SELECT is(
    training_plan() -> 'weeks' -> 0 ->> 'plannedCount',
    '3',
    'training_plan() reads the active plan, with planned counts per week'
);

SELECT is(
    jsonb_array_length(training_plan() -> 'sessions'),
    3,
    'training_plan() lists archived templates too, marked archived'
);

-- Week review.

CREATE TEMP TABLE review AS
SELECT plan_week_review((SELECT id FROM ids WHERE name = 'plan'), 1::SMALLINT) AS r;

SELECT is(
    (SELECT r -> 'missed' -> 0 ->> 'title' FROM review),
    'Moonboard',
    'The review lists missed items'
);

SELECT is(
    (SELECT jsonb_agg(u ->> 'id') FROM review, jsonb_array_elements(r -> 'unplanned') u),
    '["50000000-0000-0000-0000-000000000002"]'::JSONB,
    'Unplanned sessions are those in the week not linked to an item'
);

SELECT is(
    (SELECT t ->> 'minutes' FROM review, jsonb_array_elements(r -> 'byType') t WHERE t ->> 'type' = 'board'),
    '90',
    'byType sums duration per session type'
);

SELECT is(
    (SELECT (r ->> 'targetMet') || '/' || jsonb_array_length(r -> 'injuries')
            || '/' || (r -> 'fingerboard' -> 0 -> 'grips' ->> 0) FROM review),
    'false/1/half_crimp 20 mm',
    'The review reports target, injuries and fingerboard work'
);

SELECT is(
    plan_week_review((SELECT id FROM ids WHERE name = 'plan'), 2::SMALLINT) ->> 'targetMet',
    'false',
    'An unmet week target is reported'
);

SELECT is(
    plan_week_review((SELECT id FROM ids WHERE name = 'plan'), 5::SMALLINT),
    NULL,
    'No review for a week the plan does not have'
);

UPDATE sessions SET date = '2026-10-20' WHERE id = '50000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT count(*) FROM plan_completions WHERE session_id = '50000000-0000-0000-0000-000000000001'),
    0::BIGINT,
    'A session moved to another week is unlinked from the old week''s items'
);

SELECT * FROM finish();
ROLLBACK;
