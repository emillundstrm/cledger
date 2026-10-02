BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
    ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

INSERT INTO tasks (id, user_id, list, title, notes) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     'inköp', 'Köp ny kalk', NULL),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
     'inbox', 'Boka fysioterapeut', 'Fråga om axeln'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b',
     'inbox', 'Annans uppgift', NULL);

INSERT INTO journal_entries (id, user_id, entry_date, content, tags) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     '2026-10-01', 'Kände mig trött efter passet, axeln ömmade.', '{}'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
     '2026-10-01', 'Bra kväll med familjen.', '{familj}');

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

UPDATE tasks SET status = 'done' WHERE id = '20000000-0000-0000-0000-000000000001';
SELECT isnt(
    (SELECT completed_at FROM tasks WHERE id = '20000000-0000-0000-0000-000000000001'),
    NULL,
    'Completing a task sets completed_at'
);

UPDATE tasks SET status = 'open' WHERE id = '20000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT completed_at FROM tasks WHERE id = '20000000-0000-0000-0000-000000000001'),
    NULL,
    'Reopening a task clears completed_at'
);

SELECT results_eq(
    $$SELECT list, open_count FROM task_lists()$$,
    $$VALUES ('inbox'::TEXT, 1::BIGINT), ('inköp'::TEXT, 1::BIGINT)$$,
    'task_lists puts inbox first and counts only the user''s tasks'
);

SELECT is(
    (SELECT id FROM search('kalken') LIMIT 1),
    '20000000-0000-0000-0000-000000000001'::UUID,
    'Search finds tasks'
);

SELECT is(
    (SELECT id FROM search('trötthet') LIMIT 1),
    '30000000-0000-0000-0000-000000000001'::UUID,
    'Search finds journal entries'
);

SELECT set_eq(
    $$SELECT kind FROM search('axeln')$$,
    ARRAY['task', 'journal'],
    'One search spans tasks and journal entries'
);

SELECT set_eq(
    $$SELECT kind FROM search('axeln', ARRAY['journal'])$$,
    ARRAY['journal'],
    'kinds restricts search'
);

SELECT is(
    (SELECT count(*) FROM journal_entries WHERE entry_date = '2026-10-01'),
    2::BIGINT,
    'Several journal entries per day are allowed'
);

SELECT throws_ok(
    $$INSERT INTO journal_entries (user_id, content, mood)
      VALUES ('00000000-0000-0000-0000-00000000000a', 'x', 6)$$,
    '23514',
    NULL,
    'Mood is limited to 1-5'
);

SELECT * FROM finish();
ROLLBACK;
