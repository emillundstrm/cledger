BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local');

INSERT INTO notes (id, user_id, title, content) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     'Inköp', E'Till helgen:\n- [ ] kaffefilter\n- [ ] kaffe');

INSERT INTO journal_entries (id, user_id, entry_date, content, tags) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     '2026-10-01', 'Kände mig trött efter passet, axeln ömmade.', '{}'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
     '2026-10-01', 'Bra kväll med familjen.', '{familj}');

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

-- Checklist changes are not revisions.
UPDATE notes SET content = E'Till helgen:\n- [ ] kaffe\n- [x] kaffefilter'
WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE notes SET content = E'Till helgen:\n- [ ] kaffe\n- [ ] bröd\n- [x] kaffefilter'
WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT count(*) FROM note_revisions),
    0::BIGINT,
    'Ticking, reordering and adding checklist items records no revision'
);

UPDATE notes SET content = E'Till nästa vecka:\n- [ ] kaffe\n- [ ] bröd\n- [x] kaffefilter'
WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT count(*) FROM note_revisions),
    1::BIGINT,
    'Editing the note''s other text still records a revision'
);

SELECT is(
    (SELECT id FROM search('kaffefiltret') LIMIT 1),
    '10000000-0000-0000-0000-000000000001'::UUID,
    'Checklist items are found through their note'
);

SELECT is(
    (SELECT id FROM search('trötthet') LIMIT 1),
    '30000000-0000-0000-0000-000000000001'::UUID,
    'Search finds journal entries'
);

SELECT set_eq(
    $$SELECT kind FROM search('axeln kaffe')$$,
    ARRAY['note', 'journal'],
    'One search spans notes and journal entries'
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

SELECT hasnt_table('public', 'tasks', 'Tasks are retired');

SELECT * FROM finish();
ROLLBACK;
