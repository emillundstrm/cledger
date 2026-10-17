BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'a@test.local');

-- The 4-week period starts on the Monday three weeks before this week's Monday.
CREATE TEMP TABLE period_start AS
SELECT (date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks')::DATE AS d;
GRANT SELECT ON period_start TO authenticated;

INSERT INTO sessions (user_id, date, types, intensity, performance)
SELECT '00000000-0000-0000-0000-00000000000a', p.d + v.offset_days, v.types, 5, v.performance
FROM period_start p,
     (VALUES
         (-2, '{boulder}'::TEXT[], 'strong'),
         (0, '{running}'::TEXT[], 'normal'),
         (1, '{hangboard}'::TEXT[], 'normal'),
         (1, '{routes}'::TEXT[], 'weak'),
         (2, '{board,strength}'::TEXT[], 'normal'),
         (20, '{boulder}'::TEXT[], 'strong')
     ) AS v(offset_days, types, performance);

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

SELECT is(
    (SELECT COUNT(*)::INT FROM session_performance_log('4w')),
    3,
    'Only climbing sessions inside the period are listed'
);

SELECT is(
    (SELECT rolling_score FROM session_performance_log('4w')
     WHERE session_date = (SELECT d + 1 FROM period_start)),
    0.00,
    'The rolling score counts a climbing session from before the period start'
);

SELECT is(
    (SELECT rolling_score FROM session_performance_log('4w')
     WHERE session_date = (SELECT d + 2 FROM period_start)),
    0.00,
    'A session mixing board with strength counts as climbing'
);

SELECT is(
    (SELECT rolling_score FROM session_performance_log('4w')
     WHERE session_date = (SELECT d + 20 FROM period_start)),
    1.00,
    'Sessions more than 13 days back drop out of the rolling score'
);

SELECT * FROM finish();
ROLLBACK;
