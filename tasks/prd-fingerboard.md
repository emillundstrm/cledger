# PRD: Fingerboard Training Tool

## Introduction

CLedger today logs sessions *after the fact*: a `hangboard` session type exists, but it carries no
structure — no load, no grip, no edge. This epic turns CLedger from a logging app into a training
app for the fingerboard specifically: it guides execution with a timer and audio cues, records what
actually happened at set granularity, and auto-creates the session entry when you finish.

The organising idea is that **the pick-up (max lift) is a calibration primitive, not just another
exercise**. Apps like Crimpd cannot recommend load because they have no measured maximum for the
user — they only know what you told them you did last time. A pick-up produces a real MVC in
kilos per grip/edge/hand. Once that number exists, every other protocol is prescribed as a
percentage of a measured maximum rather than as a guess. That is the differentiator, and it is why
calibration ships in the first slice rather than later.

## Goals

- Guide a fingerboard workout hands-free: timer, audio cues, screen stays awake.
- Record fingerboard work at **set** granularity (load, grip, edge, hand, completion, RPE).
- Establish and track **MVC per grip × edge × hand** from pick-up tests.
- Recommend working load from measured MVC, falling back to history-based progression.
- Auto-create the `sessions` row on completion, leaving at most two taps of subjective input.
- Support pick-ups, which Crimpd does not.

## Non-Goals (this epic)

- No Bluetooth force gauge integration (Tindeq/WH-C06). Schema is made ready for it; no code.
- No force-curve capture or rate-of-force-development analysis.
- No protocols beyond max lift and repeaters (Abralifts, density hangs follow as config).
- No workout plans, periodisation, or multi-week programming.
- No editing of a workout after it is saved (delete and redo).
- No offline/PWA support.

## Design Decisions

### D-1: Unified load model

Every set records **absolute force through the fingers in kg** as `total_load_kg`, regardless of
whether it was a hang or a pick-up:

| Mode     | Inputs                          | `total_load_kg`          |
|----------|---------------------------------|--------------------------|
| `hang`   | bodyweight + `added_kg` (may be negative for assistance) | `bodyweight_kg + added_kg` |
| `pickup` | `lifted_kg`                     | `lifted_kg`              |

Raw inputs are kept alongside the derived value so nothing is lost. `total_load_kg` is computed at
write time rather than as a generated column, because bodyweight lives on the parent workout and
Postgres generated columns cannot reference other tables. This is the one piece of denormalisation
in the design and it is deliberate: it makes MVC a plain `MAX()` query.

### D-2: Grip, edge and hand live on the set, not the workout

A single max-lift workout commonly tests left and right separately. Keying at set level allows
that, makes left/right asymmetry visible (a useful injury signal CLedger cannot currently see), and
gives recommendation a precise key. Half-crimp on 20mm two-hand and open-hand on 10mm one-hand are
different exercises with different maxima; comparing them would make recommendations noise.

### D-3: A protocol compiles to a flat timeline

A protocol is a parameterised template that compiles to an ordered list of steps
(`prepare → work → rest → … → set_rest → …`). The execution engine is then a state machine walking
that list, so adding Abralifts or density hangs later is a config change, not new UI. Max lift uses
the same machinery, with a load-entry prompt during the rest step.

### D-4: iOS is the timing floor

Target is iPhone/Safari, which means: no Vibration API, no Web Bluetooth, Wake Lock only on
Safari 16.4+. Consequences:

- Cues are **pre-scheduled on the Web Audio clock** (`AudioContext.currentTime + delta`), not
  `setTimeout`, which drifts and is throttled.
- The `AudioContext` must be created and unlocked inside the first user gesture (the Start tap).
- Remaining time is always recomputed from a `performance.now()` anchor, never accumulated, so the
  timer self-corrects after any stall.
- Wake Lock is requested on start and re-acquired on `visibilitychange`.
- **Audio must declare the `playback` session type.** iOS routes Web Audio into the *ambient*
  session by default, and that session is silenced by the physical ringer switch no matter how
  high the volume is — so cues are simply inaudible on a muted iPhone. Setting
  `navigator.audioSession.type = "playback"` before creating the `AudioContext` opts out of this.
  Safari 16.4+, the same floor as Wake Lock. A "Test sound" control on the setup screen lets the
  user confirm cues work before committing to a hang.
- **Known limitation:** if the screen locks or the user switches apps, iOS suspends audio and
  cues will be missed. On return, the timer resyncs to wall-clock position rather than showing a
  stale value. Keeping the screen awake is the mitigation; true background audio needs a native app.

### D-4a: Hand modes, and why alternating shares a rest

A set is distributed across hands by a `HandMode`: `both` (a genuine two-handed effort), `left`,
`right`, or `alternate`. Alternating works left, pauses `handSwitchSeconds` (default 10s), works
right, and only then takes the full set rest — one rest interval covers both sides rather than one
each. Testing hands as two separate workouts nearly doubles wall-clock time for no physiological
benefit: a 5-set max lift costs 830s alternating versus 1510s as two single-hand workouts, and the
recovery that matters is per-hand, which alternating already provides via the other hand's turn.

Max lift defaults to `alternate`, because a test whose purpose is to find per-hand maxima should
measure both by default. Repeaters defaults to `both`.

Each hand's attempt is its own `fingerboard_sets` row, which D-2 already allows. Attempts are
recorded per hand during the set rest that follows them, where there is time; the final set has no
following rest, so its attempts are entered on the summary screen.

### D-5: Workouts create sessions, rather than living inside them

`fingerboard_workouts.session_id` is a nullable FK to `sessions`. On completion the workout creates
and links a session. This keeps all existing session-centric analytics (training load, weekly
counts) working untouched, and allows a workout to be attached to a session that also included
bouldering.

## User Stories

### US-001: Pick-up max lift test (calibration)
**Description:** As a user, I want to run a guided max-lift test where I pick up progressively
heavier weights from an edge, so I have a measured maximum per grip/edge/hand.

**Acceptance Criteria:**
- [x] Protocol picker lists "Max Lift" with a one-line description
- [x] Setup screen selects grip, edge depth (mm), hand, and starting load
- [x] Default protocol params: 10s prepare, 5s hold, 180s rest, 5 attempts (all editable)
- [x] During each rest step the user records the attempt: load lifted, and held vs. failed
      (the prescribed hold time is recorded; partial hold duration is not captured — see Deviations)
- [x] Failed attempts are recorded, not discarded (they bound the max from above)
- [x] On completion the heaviest successful set becomes the new MVC for that grip/edge/hand
- [x] Suggested next attempt load increments from the last successful attempt
- [x] Typecheck passes

### US-002: Repeaters driven off measured MVC
**Description:** As a user, I want repeaters prescribed as a percentage of my measured max, so the
load is right without me guessing.

**Acceptance Criteria:**
- [x] Protocol picker lists "Repeaters"
- [x] Default params: 10s prepare, 7s work, 3s rest, 6 reps/set, 5 sets, 180s set rest (all editable)
- [x] Setup screen prefills load from `recommend_fingerboard_load` for the chosen grip/edge/hand
- [x] The screen states where the recommendation came from (measured MVC vs. last session vs. none)
- [x] Hang mode: user enters added weight; total load shown as bodyweight + added
- [x] User can override the recommended load before starting
- [x] Typecheck passes

### US-003: Guided execution
**Description:** As a user, I want the app to tell me when to pull and when to let go, so I do not
have to look at the screen mid-hang.

**Acceptance Criteria:**
- [x] Full-screen run view: current phase, seconds remaining, set/rep counter, target load
- [x] Distinct audio cues for 3-2-1 countdown, start-of-work, and end-of-work
- [x] Screen stays awake via Wake Lock while a workout is running
- [x] Timer is accurate to within 100ms over a full workout (no drift accumulation)
- [x] Returning to the tab after backgrounding resyncs to the correct position
- [x] Pause, resume, skip-step and abandon controls
- [x] Abandoning mid-workout offers to save completed sets or discard
- [x] Colour/typography make the current phase readable at arm's length
- [x] Typecheck passes

### US-004: Auto-logged session
**Description:** As a user, I want finishing a workout to create my session entry, so I never log
a fingerboard session by hand again.

**Acceptance Criteria:**
- [x] On completion a summary screen shows sets, loads and total time
- [x] Summary asks only for session RPE (1-10) and performance (weak/normal/strong)
- [x] Saving creates a `sessions` row: today's date, `types = ['hangboard']`, duration from actual
      elapsed time, auto-generated notes summarising the workout
- [x] The created session is linked back via `fingerboard_workouts.session_id`
- [x] The session appears immediately in the sessions list and counts toward training load
- [x] Deleting the session does not delete the workout record (FK is `ON DELETE SET NULL`)
- [x] Typecheck passes

### US-005: Strength history
**Description:** As a user, I want to see my measured maxima and how they are trending.

**Acceptance Criteria:**
- [x] Fingerboard landing page lists current MVC per grip × edge × hand with test date
- [x] Maxima older than 90 days are visually marked as stale
- [x] Left/right maxima for the same grip+edge show an asymmetry percentage
- [x] Past fingerboard workouts are listed with date, protocol and top load
- [x] Typecheck passes

### US-006: MCP access
**Description:** As a coaching LLM, I want to read fingerboard data so I can advise on load.

**Acceptance Criteria:**
- [x] MCP exposes current maxima per grip/edge/hand
- [x] MCP exposes recent fingerboard workouts with their sets
- [x] Types mirrored in `mcp-server/src/types.ts` and `api.ts` per the cross-cutting rule
- [x] Typecheck passes

### US-007: Test both hands within one set
**Description:** As a user, I want a max lift test to work left then right inside a single set, so
one rest interval covers both hands instead of one each.

**Acceptance Criteria:**
- [x] Hand selector offers both hands, left only, right only, and each hand (alternating)
- [x] Alternating compiles to work(left) → switch gap → work(right) → set rest
- [x] The switch gap is configurable (default 10s) and omitted when set to zero
- [x] Exactly one set rest per set, regardless of how many hands are worked
- [x] The run view names the hand under load, and a switch names the hand being switched to
- [x] Each hand's attempt is recorded and stored as its own set row, with its own load
- [x] A successful max-lift attempt raises the next attempt on that same hand only
- [x] Load is prefilled from the weaker side, so the opening attempt is liftable on both
- [x] Typecheck passes

## Data Model

```
fingerboard_workouts
  id, user_id, session_id (FK sessions, NULL, ON DELETE SET NULL)
  protocol           'max_lift' | 'repeaters'
  performed_at       TIMESTAMPTZ
  bodyweight_kg      NUMERIC(5,2) NULL   -- needed to interpret hang loads
  params             JSONB               -- the protocol params actually used
  duration_seconds   INTEGER NULL
  completed          BOOLEAN
  notes              TEXT

fingerboard_sets
  id, user_id, workout_id (FK, ON DELETE CASCADE)
  set_index          SMALLINT            -- 1-based ordering
  grip               'half_crimp' | 'open' | 'full_crimp' | 'three_finger_drag'
  edge_mm            SMALLINT
  hand               'both' | 'left' | 'right'
  mode               'hang' | 'pickup'
  added_kg           NUMERIC(6,2) NULL   -- hang: +added / -assistance
  lifted_kg          NUMERIC(6,2) NULL   -- pickup: absolute
  total_load_kg      NUMERIC(6,2)        -- unified, see D-1
  work_seconds       NUMERIC(5,2) NULL
  completed          BOOLEAN
  rpe                SMALLINT NULL       -- 1-10
  peak_force_kg      NUMERIC(6,2) NULL   -- reserved for a force gauge (D-6)
```

### D-6: Force-gauge readiness

`fingerboard_sets.peak_force_kg` is nullable and unused in this epic. When a Progressor or BT scale
is added, it is populated from the device and a `fingerboard_force_samples` child table holds the
curve. Nothing in this design needs to change to accommodate that — device data becomes a more
precise source for the same `total_load_kg` / MVC pipeline.

## RPC Functions

- `fingerboard_maxes()` → best successful pick-up load per grip × edge × hand, with test date.
- `recommend_fingerboard_load(protocol, grip, edge_mm, hand)` → recommended kg plus a `source`
  string explaining the basis.

**Recommendation rules (v1):**
1. If an MVC exists for the key and is <120 days old, prescribe a protocol percentage of it —
   repeaters 65%, max lift 100% (start point). Source: `measured_max`.
2. Otherwise use the last completed workout of the same protocol and key, with progression:
   all sets completed and median RPE ≤ 7 → +2.5%; RPE 8-9 → hold; any failure or RPE 10 → −5%.
   Source: `last_session`.
3. Otherwise no recommendation; the user enters a load. Source: `none`.

Percentages are deliberately conservative and are constants in one place, so they are easy to tune
once there is real data to tune against.

## Technical Considerations

- Migration `20260911000000_fingerboard.sql`; RLS on both tables (`auth.uid() = user_id`,
  UPDATE with both USING and WITH CHECK); RPCs `SECURITY INVOKER`.
- Protocol definitions, timeline compilation and the timer live in `frontend/src/lib/fingerboard/`
  and are pure/unit-testable; the timeline compiler and recommendation maths get Vitest coverage.
- Reuse existing ShadCN components; no new UI dependencies.
- Per the cross-cutting rule, new RPCs touch four files: `frontend/src/api/analytics.ts` +
  `types.ts`, `mcp-server/src/api.ts` + `types.ts`.

## Success Criteria

- A repeaters workout can be run start to finish without touching the screen mid-set.
- Finishing a workout produces a correct session entry in under two taps.
- After one max-lift test, repeaters loads are prescribed rather than guessed.
- Pick-ups are first-class, which is the thing Crimpd cannot do.

## Deviations from spec as built

- **Per-attempt hold duration is not captured.** A max-lift attempt records the load and whether
  the prescribed hold was achieved, not how many seconds were actually held on a failed attempt.
  A failed attempt therefore bounds the max from above but does not say by how much. Capturing
  partial hold time needs either a stopwatch the user stops by hand mid-attempt — awkward with
  loaded fingers — or the force gauge from D-6, which would give it for free. Deferred to the
  device work rather than bolted on.
- **Timer accuracy is verified by construction and unit test, not by browser measurement.**
  Position is derived from a `performance.now()` anchor on every frame, so error cannot accumulate;
  `positionAt` is unit-tested at step boundaries and across a large jump forward. An end-to-end
  drift measurement over a full 17-minute repeaters workout on a real iPhone has not been run.
- **The local Supabase stack could not be started in this environment** (Docker Desktop port
  forwarding was failing under WSL), so the migration and both RPCs were verified against a
  throwaway Postgres container running the same `supabase/postgres:17.6.1` image instead. All
  seven recommendation and MVC cases were exercised there; nothing has been run against the
  project's own local instance.
