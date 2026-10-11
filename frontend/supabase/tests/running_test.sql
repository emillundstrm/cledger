BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
    ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

INSERT INTO sessions (user_id, date, types, intensity, performance, distance_km, garmin_activity_id) VALUES
    ('00000000-0000-0000-0000-00000000000a', '2026-10-12', '{running}', 4, 'normal', 8.25, '17234567890');

SELECT throws_ok(
    $$INSERT INTO sessions (user_id, date, types, intensity, performance, garmin_activity_id)
      VALUES ('00000000-0000-0000-0000-00000000000a', '2026-10-13', '{running}', 4, 'normal', '17234567890')$$,
    '23505',
    NULL,
    'A Garmin activity is copied to one session only'
);

SELECT lives_ok(
    $$INSERT INTO sessions (user_id, date, types, intensity, performance, garmin_activity_id)
      VALUES ('00000000-0000-0000-0000-00000000000b', '2026-10-13', '{running}', 4, 'normal', '17234567890')$$,
    'The same activity id is fine for another user'
);

SELECT lives_ok(
    $$INSERT INTO sessions (user_id, date, types, intensity, performance)
      VALUES ('00000000-0000-0000-0000-00000000000a', '2026-10-13', '{running}', 4, 'normal'),
             ('00000000-0000-0000-0000-00000000000a', '2026-10-14', '{running}', 4, 'normal')$$,
    'Sessions without a Garmin activity do not collide'
);

SELECT throws_ok(
    $$INSERT INTO sessions (user_id, date, types, intensity, performance, distance_km)
      VALUES ('00000000-0000-0000-0000-00000000000a', '2026-10-15', '{running}', 4, 'normal', 0)$$,
    '23514',
    NULL,
    'A distance must be positive'
);

SELECT * FROM finish();
ROLLBACK;
