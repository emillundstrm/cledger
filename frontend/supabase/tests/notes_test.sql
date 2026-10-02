BEGIN;
SELECT plan(9);

-- Two users, so RLS isolation can be checked.
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
    ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

INSERT INTO notes (id, user_id, title, content, tags) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
     'Axellärdomar', 'Vänster axeln blir irriterad av breda kompressionsgrepp.', '{träning,axel}'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
     'Sömn', 'Dålig sömnkvalitet veckan före tävling.', '{hälsa}'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a',
     'Fingerstyrka', 'Half crimp på 20mm går framåt. Klättrade hårt i tisdags.', '{träning}'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b',
     'Annans axel', 'Någon annans axel.', '{}');

UPDATE notes SET archived_at = now() WHERE id = '10000000-0000-0000-0000-000000000002';

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

SELECT is(
    (SELECT id FROM search('klättring') LIMIT 1),
    '10000000-0000-0000-0000-000000000003'::UUID,
    'Swedish inflection matches (klättring ~ klättrade)'
);

SELECT is(
    (SELECT id FROM search('axel') LIMIT 1),
    '10000000-0000-0000-0000-000000000001'::UUID,
    'Inflected form matches (axel ~ axeln)'
);

SELECT is(
    (SELECT id FROM search('crimp framsteg tisdags') LIMIT 1),
    '10000000-0000-0000-0000-000000000003'::UUID,
    'Mixed-language query matches'
);

SELECT is(
    (SELECT count(*) FROM search('axel') WHERE id = '10000000-0000-0000-0000-000000000004'),
    0::BIGINT,
    'Other users'' notes are not searchable'
);

SELECT is(
    (SELECT count(*) FROM search('sömn')),
    0::BIGINT,
    'Archived notes are excluded by default'
);

SELECT is(
    (SELECT count(*) FROM search('sömn', NULL, 20, TRUE)),
    1::BIGINT,
    'Archived notes are included on request'
);

UPDATE notes SET content = 'Ny lärdom.' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE notes SET pinned = TRUE WHERE id = '10000000-0000-0000-0000-000000000001';

SELECT results_eq(
    $$SELECT content FROM note_revisions WHERE note_id = '10000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('Vänster axeln blir irriterad av breda kompressionsgrepp.'::TEXT)$$,
    'Editing content records the previous version; pinning does not'
);

DELETE FROM note_revisions;
SELECT is(
    (SELECT count(*) FROM note_revisions),
    1::BIGINT,
    'Revisions cannot be deleted by the user'
);

SELECT results_eq(
    $$SELECT tag, count FROM note_tags()$$,
    $$VALUES ('träning'::TEXT, 2::BIGINT), ('axel'::TEXT, 1::BIGINT)$$,
    'note_tags counts tags of the user''s active notes'
);

SELECT * FROM finish();
ROLLBACK;
