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

### D-4b: Attempts are prescribed ahead, not bumped afterwards

The first version raised the next attempt by a fixed 2.5kg when the user tapped "Held". That failed
in two ways in real use: `completed` defaulted to true, so the button already looked selected and
tapping nothing progressed nothing; and the run view showed the workout's *starting* load on every
set, so the prescribed weight was never visible before the set anyway — you could not know what to
put on the pin.

Loads are now prescribed for every attempt up front and shown at setup, so plates can be planned
before starting. The ramp decelerates — `[1.20, 1.10, 1.05, 1.03]`, then 1.03 onwards — because a
long way below your max a big jump costs only a little fatigue, while near it a small step avoids
burning an attempt on a weight you were never going to hold. Each result is rounded to the plate
increment the user actually owns (default 2kg, remembered between workouts), and forced at least
one increment above the previous attempt so rounding cannot stall the ladder on a repeated weight.

Adaptation replaces the old bump:

- Editing an attempt's load re-plans the attempts after it, continuing the ramp from the new weight.
- Missing an attempt makes the remaining attempts **bisect** between the heaviest weight held and
  the one missed, rather than continuing to climb — once you have failed, the max is bracketed and
  narrowing the bracket is the only informative thing left to do.
- Recording a hold changes no weights, because the ladder already prescribed them.

Each hand carries its own ladder, so the sides progress independently.

### D-4c: Load entry is a stepper, not a number field

A stock number input means a fiddly caret, spinner targets too small to hit, and a keyboard over
half the screen — all awkward mid-session with chalk on your hands. Loads are entered with large
−/+ controls stepping by the plate increment, which is both faster and closer to what physically
happens on the pin. The value stays directly editable for awkward numbers.

### D-4d: Hang or lift is a workout choice

Both protocols default to **lifts**, which is what the user actually trains. `mode` was previously
fixed per protocol; it is now chosen per workout, so hangs remain available without being the
assumption. `fingerboard_sets.mode` was already per-set, so no migration was needed.

### D-4e: Only work that happened is recorded

`completed` defaults to true, and skipping jumps elapsed time forward, so a skipped set used to be
saved as completed — a five-set test where the last set was skipped reported "8/10 completed". The
timer now records which steps were skipped rather than worked, and on finishing only (set, hand)
pairs whose work step actually ran to completion are kept. Sets that never happened are dropped
rather than stored as successes.

Relatedly, "top load" now means the heaviest weight **held**. Reporting a missed attempt as a top
load overstated the result, and contradicted `fingerboard_maxes()`, which already counted only
completed sets.

### D-4f: Protocol intensities, and where they come from

| Protocol | Work | Rest | Volume | Intensity |
|---|---|---|---|---|
| Max Lift | 5s | 180s | 5 attempts | ramps to 100% |
| Repeaters | 7s on / 3s off | 180s | 6 reps x 5 sets | 65% |
| Abralifts | 10s | 50s | 10 sets | ~40% (see below) |
| Density Hangs | 30s | 240s | 2 x 4 sets | 65% |

**Abralifts** follows Emil Abrahamsson's submaximal protocol — 10s on, 50s off, ten times, at a
load producing light strain (~40% of max), done twice daily six hours apart. The rationale is
Baar's collagen-synthesis work: loaded tissue stops responding after ~10 minutes and needs ~6 hours
to resensitise, so the session is deliberately short and frequent rather than hard. Intensity
varies by grip, matching how the user actually trains: 50% on half crimp, open hand and three
finger drag; 30% on front three and back three; 40% elsewhere, per the published protocol.

**Density hangs** use 20-40s holds at 55-85% of max, 2-3 per set, 3-5 minutes between sets, 4-9
sets — long, moderate, close to failure, aimed at tendon density and cross-sectional area rather
than peak force. Defaults sit mid-range at 30s and 65%.

Both are configurable; the defaults are a documented starting point, not a prescription.

The `front_three` and `back_three` grips were added for Abralifts, since those positions are
trained at a distinctly lower percentage and would otherwise be lumped in with three finger drag.

### D-4g: A workout is a sequence of grip positions

Abralifts is a circuit, not a single grip repeated ten times. The published routine is:

| Position | Sets | Effort |
|---|---|---|
| Four finger crimp, 14mm | 3 | 70-80% |
| Three finger drag, deep pocket | 3 | 70-80% |
| Middle two finger pocket | 1 | 50-60% |
| Front two finger pocket | 1 | 50-60% |
| Middle two finger crimp | 1 | 30-40% |
| Front two finger crimp | 1 | 30-40% |

Modelling a workout as one grip made that impossible to run, and mixing positions between sets is
normal well beyond this protocol. Grip, edge, set count and load therefore moved off the workout and
onto a **block** — one grip position — with a workout holding an ordered list of them. `params.sets`
is gone; total sets are the sum across blocks. Steps carry a `blockIndex`, and `RecordedSet` does
too, so each set is stored against the position it was actually worked at. `fingerboard_sets`
already carried grip and edge per row, so no data migration was needed — only the new grip values.

Single-position protocols are the degenerate case with one block, and `multiBlock` controls whether
positions can be added or removed.

Re-laddering is scoped to (hand, position): a heavier half crimp says nothing about what to lift on
a two-finger pocket.

**On intensity — the published percentages cannot be taken at face value.** "70-80% of what it
would take to lift from the ground" describes a *two-handed* lift, while loads here are recorded
per hand, so reading it directly doubled the intended intensity. The study behind the protocol
states ~40% of max — "light strain on the forearms" — which is what halving the published figure
gives. The weaker positions keep the routine's relative shape scaled by the same factor:

| Position | Published | Used |
|---|---|---|
| Four finger crimp, three finger drag, front/back three | 70-80% (two-hand) | 40%, 30% for front/back three |
| Two finger pockets | 50-60% | 30% |
| Two finger crimps | 30-40% | 20% |

This is a daily tendon-loading protocol where being wrong upward is the harmful direction, so every
figure was revised down rather than up.

**Structure follows the study, not the blog summary:** six positions at 6 + 6 + 2 + 2 + 2 + 2 = 20
reps, 10s on with a short rest — not the 3 + 3 + 1 + 1 + 1 + 1 the secondary write-up gives.

**Session length is surfaced, not silently traded away.** The study fits 20 reps into 10 minutes
because both hands work at once. Working one hand at a time doubles the clock for the same per-hand
volume, putting the default at ~20 minutes — past the ~10 minute window the protocol is built
around, since loaded tissue stops responding beyond roughly that long. Setup shows the estimated
duration and says so explicitly, leaving the trade (halve the sets, or use both hands) to the user
rather than quietly cutting volume.

### D-4h: Summary is a card list, not a table

For a lift the entered weight *is* the load through the fingers, so the table's separate "lifted"
and "total" columns showed the same number twice, squeezing the input until its value could not be
read on a phone even in landscape. The total is now shown only for hangs, where bodyweight makes it
differ, and sets render as stacked cards with a full-width stepper rather than table cells.

Focusing the weight input now selects its contents, because selecting existing text to replace it
is impractical on iOS — that, not the steppers, was what made correcting a weight hard.

The default plate step is **1kg**: adjustments between positions are small, and coarse steps forced
manual typing, which was the awkward path.

### D-4i: Volume presets and a single overall load control

**Presets.** A protocol can offer named volume variants. Abralifts has *Full* (the study's 20 reps)
and *Half* (10), which halves every position rather than dropping any, preserving the circuit's
shape. Half is the default: it is the volume the user actually reaches for, and — because
alternating hands doubles the clock — the only variant that fits inside the ~10 minute loading
window. The choice is remembered per protocol.

**Load entry is a mode, not a second dial.** The first attempt offered a per-position editor *and*
an overall scale at the same time — two controls driving the same six numbers, which read as
confusing rather than convenient. It is now an explicit either/or:

- **One weight for the whole session** — set the first position; every other follows in proportion.
- **A weight per position** — dial each in separately, for a first run or a fine correction.

Switching carries the current loads across, so neither mode discards work done in the other. The
choice is remembered.

**Relative grip ratios make the single dial possible.** Percentages are of each grip's *own*
measured max, so with no maxes recorded every position sat at zero and a first run meant setting
six numbers by hand. `GRIP_ANCHOR_RATIO` gives each position's load relative to a four-finger half
crimp — 0.75 for three-finger positions, 0.5 for two-finger pockets, 0.35 for two-finger crimps —
so one number drives the circuit from cold.

These ratios agree with the measured path rather than competing with it: from a 30kg half crimp max
the per-grip percentages prescribe `12, 9, 6, 6, 4, 4`, and so does a 12kg anchor through the
ratios.

### D-4j: Saving is one transaction

Saving was three sequential client calls — create the session, create the workout, insert the sets.
A failure on the last one left the session and workout already written, and retrying wrote another
of each. In practice a missing migration made every sets insert fail on a grip constraint, and four
retries logged four identical sessions while reporting failure each time. The error text made it
worse by blaming the connection for what was a constraint violation.

`save_fingerboard_workout` now does all three inserts in one function, so PostgREST runs them in a
single transaction: a failure rolls back everything and a retry is safe. Errors surface the real
message rather than a guess at the cause.

The lesson generalises — any multi-write operation that can half-succeed needs to be one
transaction, not a sequence of client calls.

### D-4k: Edge depth is a session-level choice

Edge belongs with load: the whole circuit is normally done on one rung. In "one weight for the
whole session" mode there is a single edge selector; per-position edges appear only in
per-position mode.

Edge options are the even millimetre rungs found on real boards — 10, 12, 14, 16, 18, 20, 22 —
defaulting to 16mm. The previous list (6, 8, 10, 12, 15, 20, 25, 30) had no 14mm, while the
Abralifts preset specified 14mm from the published routine, so the picker displayed a value it
could not represent and silently reverted to 20mm for later positions. A test now asserts that
every preset edge is selectable, so the two cannot drift apart again.

### D-4l: Workouts are deletable

`fingerboard_workouts.session_id` is `ON DELETE SET NULL` by design (D-5), so deleting a logged
session unlinks the workout rather than removing it — a workout can outlive the session, and a
session may cover more than fingerboard work. The gap was that nothing could delete a *workout*:
`deleteFingerboardWorkout` existed in the API layer and was never called from anywhere, so the
orphan workouts left by the non-atomic save could not be cleared from the UI at all.

History rows now expand to a delete control behind a confirmation, which states plainly that the
logged session is left alone. A workout with no sets — the shape a half-failed save produced — says
so rather than rendering an empty table.

### D-4m: The run view describes what is next, not what is done

The set you have just finished is not information you can act on. During work the main panel
describes the set in progress; during any rest it describes the one coming up, labelled "Next" so
it cannot be mistaken for the current one. That removed the separate next-up panel entirely — the
same information in one place instead of two.

"Change plates" compares against the last work step actually performed rather than whatever the
rest step is tagged with, which matters for the hand-switch gap, where the step already carries the
*next* hand. In practice it fires exactly where the circuit moves between grip positions, and stays
quiet for rests within one.

### D-4n: Leaving mid-workout asks first

A started workout holds data that exists nowhere else until it is saved, and the back button
discarded it silently. Navigation is blocked while a workout is running or sitting unsaved on the
summary, via `useBlocker`, with `beforeunload` covering tab close and refresh. Saving and
discarding both set a ref the blocker reads, since the blocker runs outside React's render cycle
and would otherwise still see the pre-save value and challenge its own redirect.

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

### US-008: Prescribed, adaptive attempt ladder
**Description:** As a user, I want to know what weight each attempt will be before I start, and
have the app adjust sensibly when I change or miss one.

**Acceptance Criteria:**
- [x] Setup shows every planned attempt before the workout starts
- [x] The ramp decelerates and never repeats a weight after rounding
- [x] Loads round to a configurable plate increment, default 2kg, remembered between workouts
- [x] The run view shows the *current* set's load, not the workout's starting load
- [x] During a rest, the next set's load is shown, flagged when the plates need changing
- [x] Editing an attempt re-plans the ones after it
- [x] Missing an attempt bisects between the best hold and the miss instead of climbing
- [x] Each hand keeps its own ladder
- [x] Load entry uses −/+ steppers sized for use mid-session
- [x] Both protocols default to lifts, with hangs selectable per workout
- [x] Typecheck passes

### US-009: Abralifts and density hangs
**Description:** As a user, I want the two submaximal protocols I actually train available.

**Acceptance Criteria:**
- [x] Abralifts: 10s on, 50s off, ten sets, prescribed from measured max
- [x] Abralifts intensity varies by grip — 50% strong positions, 30% front/back three, 40% otherwise
- [x] Density hangs: 30s holds, two per set, four sets, 65% of max
- [x] `front_three` and `back_three` grips added
- [x] Migration extends the protocol and grip constraints; invalid values still rejected
- [x] Typecheck passes

### US-010: Honest workout history
**Description:** As a user, I want to see every set I did, and not have missed attempts reported as
achievements.

**Acceptance Criteria:**
- [x] A workout in the history expands to show every set: grip, edge, hand, load, held/missed
- [x] Summary line reads "held/total" and reports the best **held** load
- [x] A skipped set is not saved as completed
- [x] Auto-generated session notes report the heaviest weight held, not attempted
- [x] Saving is disabled when no sets were actually performed
- [x] Typecheck passes

### US-011: Mixed grip positions in one workout
**Description:** As a user, I want a workout to move through several grip positions, because that is
how Abralifts and most of my sessions actually work.

**Acceptance Criteria:**
- [x] A workout holds an ordered list of positions, each with grip, edge, sets and load
- [x] Abralifts defaults to the published six-position circuit totalling ten sets
- [x] Positions can be added and removed for multi-position protocols
- [x] Set numbering runs continuously across positions; rests fall between them as within them
- [x] Each position gets its own recommended load, with the percentage shown
- [x] The run view names the current position, and the next-up panel names the upcoming one
- [x] Each set is stored against the grip and edge it was actually worked at
- [x] Re-laddering stays within a position
- [x] Typecheck passes

### US-012: Usable weight entry on a phone
**Description:** As a user, I want to correct weights on my phone without fighting the input.

**Acceptance Criteria:**
- [x] The redundant total column is shown only for hangs, where it differs from the entered weight
- [x] Sets render as cards with a full-width stepper, not as cramped table cells
- [x] Focusing the weight field selects its contents so typing replaces it
- [x] Default plate step is 1kg
- [x] Typecheck passes

### US-013: Volume presets and overall load adjustment
**Description:** As a user, I want a half-length Abralifts session, and to shift every load at once
rather than editing each position.

**Acceptance Criteria:**
- [x] Abralifts offers Full (20 sets) and Half (10 sets); Half is the default
- [x] The half variant halves every position rather than removing positions
- [x] The chosen preset is remembered per protocol
- [x] Load entry is an explicit choice between one weight for the session and one per position
- [x] The single dial drives every other position in proportion, from cold
- [x] Switching modes carries the current loads across rather than resetting them
- [x] The choice is remembered between sessions
- [x] Positions no longer start at zero when no max has been measured
- [x] Per-position edits still work and move with the overall adjustment
- [x] Estimated session duration is shown, and flags the ~10 minute loading window
- [x] Typecheck passes

### US-014: Saving cannot half-succeed
**Description:** As a user, a failed save must not leave anything behind, and retrying must not
duplicate my session.

**Acceptance Criteria:**
- [x] Workout, sets and session are written in a single transaction
- [x] A constraint violation rolls back all three; no orphan session remains
- [x] Retrying after a failure produces exactly one session, not one per attempt
- [x] The error message states the real cause rather than blaming the connection
- [x] Typecheck passes

### US-015: Session-level edge depth
**Description:** As a user, I want to set the edge once for the session, as I do the weight.

**Acceptance Criteria:**
- [x] One edge selector applies to every position in single-weight mode
- [x] Per-position edges remain available in per-position mode
- [x] Edge options are 10, 12, 14, 16, 18, 20, 22mm, defaulting to 16mm
- [x] Every preset edge is guaranteed to be one the picker offers
- [x] Typecheck passes

### US-016: Deleting a fingerboard workout
**Description:** As a user, I want to remove a workout, including leftovers from a failed save.

**Acceptance Criteria:**
- [x] Each workout in the history can be deleted, behind a confirmation
- [x] The confirmation states that the logged session is not deleted with it
- [x] Deleting refreshes measured maxima, since they derive from sets
- [x] A workout with no sets explains itself rather than showing an empty table
- [x] Typecheck passes

### US-017: Run view shows what is coming
**Description:** As a user, mid-rest I want to see the next set, not the one I just finished.

**Acceptance Criteria:**
- [x] During work the panel describes the set in progress
- [x] During any rest it describes the next set, labelled so the two cannot be confused
- [x] The separate next-up panel is removed; the information lives in one place
- [x] "Change plates" compares against the last set actually performed
- [x] Typecheck passes

### US-018: Unsaved workout warning
**Description:** As a user, I do not want the back button to silently bin a finished workout.

**Acceptance Criteria:**
- [x] Navigating away during a workout or from an unsaved summary asks for confirmation
- [x] Closing or refreshing the tab warns too
- [x] Saving and discarding leave without being challenged
- [x] Leaving the setup screen is not blocked, since nothing has been recorded yet
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
