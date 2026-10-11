BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
    ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

-- A session to cross items off with.
INSERT INTO sessions (id, user_id, date, types, intensity, performance) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     '2026-10-13', '{board}', 8, 'normal');

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

CREATE TEMP TABLE ids (name TEXT PRIMARY KEY, id UUID);

INSERT INTO ids VALUES ('first', create_training_plan($${
    "title": "Höstblock",
    "startDate": "2026-10-12",
    "weeks": [
        {"week": 1, "phase": "volume", "targetCount": 3},
        {"week": 2, "phase": "strength", "focus": "Maxhäng"},
        {"week": 3, "phase": "recovery"}
    ],
    "sessions": [
        {"title": "Moonboard", "category": "strength", "sessionTypes": ["board"],
         "entries": [{"week": 1, "count": 2}, {"week": 2, "count": 2, "note": "Fler försök"}]},
        {"title": "Löpning", "category": "endurance",
         "entries": [{"week": 1}, {"week": 3}]}
    ]
}$$::JSONB));

SELECT is(
    (SELECT count(*) FROM plan_weeks WHERE plan_id = (SELECT id FROM ids WHERE name = 'first')),
    3::BIGINT,
    'create_training_plan writes the weeks'
);

SELECT is(
    (SELECT array_agg(title ORDER BY sort_order) FROM plan_sessions
     WHERE plan_id = (SELECT id FROM ids WHERE name = 'first')),
    ARRAY['Moonboard', 'Löpning'],
    'Templates keep the order they were given in'
);

SELECT is(
    (SELECT sum(count) FROM plan_entries WHERE plan_id = (SELECT id FROM ids WHERE name = 'first')),
    6::BIGINT,
    'Entries are written, with count defaulting to 1'
);

SELECT is(
    (SELECT session_types FROM plan_sessions WHERE title = 'Moonboard'),
    ARRAY['board'],
    'Default session types are stored'
);

INSERT INTO ids SELECT 'moon', id FROM plan_sessions WHERE title = 'Moonboard';
INSERT INTO ids SELECT 'moon_w1', id FROM plan_entries
WHERE plan_session_id = (SELECT id FROM ids WHERE name = 'moon') AND week_index = 1;

INSERT INTO plan_completions (user_id, session_id, plan_entry_id) VALUES
    ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001',
     (SELECT id FROM ids WHERE name = 'moon_w1'));

-- Patching.

SELECT lives_ok(
    format($$SELECT update_training_plan(%L, %L::JSONB)$$,
        (SELECT id FROM ids WHERE name = 'first'),
        jsonb_build_object(
            'weeks', jsonb_build_array(jsonb_build_object('week', 2, 'focus', 'Kort häng')),
            'sessions', jsonb_build_array(jsonb_build_object(
                'id', (SELECT id FROM ids WHERE name = 'moon'),
                'entries', jsonb_build_array(jsonb_build_object('week', 2, 'count', 3))
            ))
        )),
    'A patch can change one week''s focus and one entry''s count'
);

SELECT is(
    (SELECT phase || '/' || focus FROM plan_weeks
     WHERE plan_id = (SELECT id FROM ids WHERE name = 'first') AND week_index = 2),
    'strength/Kort häng',
    'A week patch keeps the fields it does not name'
);

SELECT is(
    (SELECT count || '/' || note FROM plan_entries
     WHERE plan_session_id = (SELECT id FROM ids WHERE name = 'moon') AND week_index = 2),
    '3/Fler försök',
    'An entry patch without a note keeps the note'
);

SELECT update_training_plan(
    (SELECT id FROM ids WHERE name = 'first'),
    jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
        'id', (SELECT id FROM ids WHERE name = 'moon'),
        'entries', jsonb_build_array(jsonb_build_object('week', 2, 'count', 0))
    )))
);
SELECT is(
    (SELECT count(*) FROM plan_entries
     WHERE plan_session_id = (SELECT id FROM ids WHERE name = 'moon') AND week_index = 2),
    0::BIGINT,
    'Count 0 removes an entry'
);

SELECT throws_like(
    format($$SELECT update_training_plan(%L, %L::JSONB)$$,
        (SELECT id FROM ids WHERE name = 'first'),
        jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
            'id', (SELECT id FROM ids WHERE name = 'moon'),
            'entries', jsonb_build_array(jsonb_build_object('week', 1, 'count', 0))
        )))),
    '%already has 1 logged session%',
    'An entry cannot drop below the sessions already logged against it'
);

SELECT update_training_plan(
    (SELECT id FROM ids WHERE name = 'first'),
    $${"weeks": [{"week": 4, "phase": "performance"}],
       "sessions": [{"title": "Rörlighet", "category": "mobility",
                     "entries": [{"week": 4, "count": 2}]}]}$$::JSONB
);
SELECT is(
    (SELECT sort_order FROM plan_sessions WHERE title = 'Rörlighet'),
    2::SMALLINT,
    'A new template in a patch goes last, in a new week'
);

SELECT update_training_plan(
    (SELECT id FROM ids WHERE name = 'first'),
    jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
        'id', (SELECT id FROM ids WHERE name = 'moon'), 'archived', true
    )))
);
SELECT isnt(
    (SELECT archived_at FROM plan_sessions WHERE id = (SELECT id FROM ids WHERE name = 'moon')),
    NULL,
    'A template can be archived'
);

-- Rejected input writes nothing.

SELECT throws_ok(
    format($$SELECT update_training_plan(%L, '{"weeks": [{"week": 6, "phase": "volume"}]}')$$,
        (SELECT id FROM ids WHERE name = 'first')),
    'A plan''s weeks must run 1..n without gaps',
    'Weeks cannot skip a number'
);

SELECT throws_ok(
    format($$SELECT update_training_plan(%L, %L::JSONB)$$,
        (SELECT id FROM ids WHERE name = 'first'),
        jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
            'id', (SELECT id FROM ids WHERE name = 'moon'),
            'entries', jsonb_build_array(jsonb_build_object('week', 9, 'count', 1))
        )))),
    '23503',
    NULL,
    'An entry cannot be in a week the plan does not have'
);

SELECT throws_ok(
    $$SELECT create_training_plan('{"title": "Fel", "startDate": "2026-10-19",
        "weeks": [{"week": 1, "phase": "power"}]}')$$,
    '23514',
    NULL,
    'An unknown phase is rejected'
);

SELECT is(
    (SELECT id FROM training_plans WHERE archived_at IS NULL),
    (SELECT id FROM ids WHERE name = 'first'),
    'A failed create leaves the previous plan active'
);

SELECT throws_ok(
    $$SELECT create_training_plan('{"title": "Fel", "startDate": "2026-10-14",
        "weeks": [{"week": 1, "phase": "volume"}]}')$$,
    '23514',
    NULL,
    'A plan starts on a Monday'
);

SELECT throws_ok(
    $$INSERT INTO training_plans (user_id, title, start_date)
      VALUES ('00000000-0000-0000-0000-00000000000a', 'Andra', '2026-10-19')$$,
    '23505',
    NULL,
    'Only one plan is active at a time'
);

-- A new plan replaces the old one.

INSERT INTO ids VALUES ('second', create_training_plan(
    '{"title": "Vinterblock", "startDate": "2026-11-09", "weeks": [{"week": 1, "phase": "strength"}]}'
));
SELECT isnt(
    (SELECT archived_at FROM training_plans WHERE id = (SELECT id FROM ids WHERE name = 'first')),
    NULL,
    'Creating a plan archives the active one'
);

SELECT throws_like(
    format($$SELECT update_training_plan(%L, '{"title": "x"}')$$,
        (SELECT id FROM ids WHERE name = 'first')),
    '%is archived%',
    'An archived plan cannot be patched'
);

-- Another user sees none of it.

SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

SELECT is(
    (SELECT count(*) FROM training_plans) + (SELECT count(*) FROM plan_weeks)
        + (SELECT count(*) FROM plan_sessions) + (SELECT count(*) FROM plan_entries)
        + (SELECT count(*) FROM plan_completions),
    0::BIGINT,
    'RLS hides another user''s plans, weeks, templates, entries and completions'
);

SELECT * FROM finish();
ROLLBACK;
