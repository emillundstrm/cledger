# PRD: Training Plans

## Introduction

CLedger logs what was trained and, with the fingerboard tool, guides one kind of training as it
happens. It has no idea what *should* be trained. Plans are usually agreed in a conversation with
the assistant, and today that conversation ends in a note the app cannot act on.

This epic adds a training plan: a run of weeks, each holding a **bucket of sessions** to get
through that week. No session is tied to a day. Logging a session crosses one off the bucket, and
the goal of a week is to clear it, or to clear a stated number of it ("minst 5 av 7"). The plan
covers climbing and other exercise alike; running belongs in the same plan as bouldering.

The assistant writes most plans through MCP. The app gives a grid to reshape a plan, and a phone
view of this week's bucket.

Inspiration is Lattice's plan builder (sessions as rows, weeks as columns, a count per cell, a
phase per week). The structure is borrowed; the load scoring is not (see D-6).

## Goals

- One active plan of N weeks, each week with a phase and a bucket of planned sessions.
- A week can require all of its bucket, or at least *k* of it.
- Logging a session can cross off one or more items from the current week's bucket.
- A planned fingerboard session starts the timer with its protocol and grips filled in.
- The assistant can create a whole plan in one call, and sees this week's bucket in `get_context`.
- A grid editor for reshaping the plan, and a "Denna vecka" view for the phone.

## Non-Goals (this epic)

- No sessions pinned to weekdays, and no calendar view.
- No planned load or time scoring.
- No automatic progression or plan generation in the app; the assistant does the thinking.
- No more than one active plan; no plan library or templates shared between plans.
- No adherence analytics beyond per-week "done of target" (a later RPC can build on the links).
- Plans are not searchable in this epic.

## Design Decisions

### D-1: A week is a bucket, not a schedule

A week holds planned sessions with no day attached. Which day a session lands on is decided when it
is done, so a bad day or a moved gym visit never breaks the plan. This is the main difference from
calendar-style plans, and the reason the plan has no weekday field at all.

### D-2: Templates across weeks, with a count per week

A plan has **session templates** (the rows in the grid: "Moonboard – maxförsök", "Löpning 40 min")
and **entries** saying how many times a template is planned in a given week. The bucket for a week
is its entries expanded by count: a count of 2 shows as two checklist rows.

Templates keep a description written once and reused for 8 weeks. An entry carries an optional
note for that week only ("4×4 istället för 3×4"), which covers week-to-week progression without
Lattice's separate progression and fraction columns.

### D-3: A week target is a count, not a list of optional items

`plan_weeks.target_count` is nullable. NULL means clear the whole bucket; a number *k* means at
least *k* of the bucket's items. The week view shows "3 av 5". Marking individual items as
optional was considered and left out: one number expresses "swap things in and out" without the
user having to decide in advance which items are the optional ones.

### D-4: A logged session crosses items off through a link table

`plan_completions (session_id, plan_entry_id)` links a logged session to an entry. It is a join
table, not a column on `sessions`, because one gym visit often covers two items (bouldering plus
antagonist work). An entry with count 2 accepts two completions. Done count for a week is the
number of completions on its entries, capped per entry at its count.

Only the current week's open items are offered when logging. Sessions outside the plan stay
ordinary sessions; nothing forces a link. Removing a link, or deleting the session, reopens the
item.

### D-5: Fixed phases describe the week's emphasis

A week has one phase from a fixed set, so the UI can colour weeks and the assistant reads a clear
intent. The set describes what the week emphasises rather than a periodisation stage, since
"base" vs "build" and "peak" vs "performance" are hard to tell apart in practice:

| Code          | Swedish       | Meaning                                      |
|---------------|---------------|----------------------------------------------|
| `volume`      | Volym         | Lots of climbing at moderate intensity       |
| `strength`    | Styrka        | Max strength: fingers, limit bouldering      |
| `endurance`   | Uthållighet   | Routes, circuits, aerobic and power endurance |
| `performance` | Prestation    | Projecting or a trip; training kept minimal  |
| `recovery`    | Återhämtning  | Deload; less volume and intensity            |

The phase is a label. It does not constrain what goes in the bucket. There is no power phase:
explosive work fits inside a strength week, and a whole week of it is rare enough that `strength`
with a `focus` line covers it.

### D-6: No planned load; the bucket's makeup is the load picture

Lattice gives each template a load and time score and sums them per week. That does not carry over
to climbing as logged here: a two-hour boulder session may hold 15 minutes on the wall, and failing
the same move repeatedly is hard but low in time under tension. RPE is logged as a feel, not a
measure. A load number would be invented precision.

Instead the grid shows, per week, the count of sessions per category. A recovery week visibly has
fewer items; a strength week visibly has more strength items. That is what the totals row in
Lattice's sheet is really used for.

### D-7: Categories describe what a session trains

`SESSION_TYPES` (boulder, routes, board, hangboard, strength, rehab, other) say what was done. A
plan category says what it is for. The two are separate fields: a board session may serve strength
in one plan and power in another.

| Code              | Swedish           |
|-------------------|-------------------|
| `strength`        | Styrka            |
| `power`           | Explosivitet      |
| `endurance`       | Uthållighet       |
| `climbing`        | Klättring         |
| `mobility`        | Rörlighet         |
| `other`           | Övrigt            |

`strength` covers both climbing strength (limit bouldering, max hangs) and general strength in the
gym (pull-ups, squats, antagonist work): they serve the same purpose, and the activity is already
told apart by `session_types`. `endurance` includes power endurance (4×4, route intervals) and
running. `climbing` is free climbing with no specific target ("öppen bouldering"). A template
also carries default `session_types`, which prefill the session form when that item is crossed
off.

### D-8: A fingerboard template carries a preset, not a load

A template may hold a `fingerboard_preset` (JSONB): protocol, hand mode, mode, and the blocks
(grip, edge, sets), without loads. "Starta" on that item opens the fingerboard setup with the
preset applied, and load comes from `recommend_fingerboard_load` as usual. When the workout is
saved, the session it creates (fingerboard D-5) is linked to the entry it was started from, so the
item crosses itself off.

Loads are left out on purpose: a plan written weeks ahead cannot know the right load, and the
recommendation already does.

### D-9: One active plan, archived rather than deleted

At most one plan is active (a partial unique index on `user_id WHERE NOT archived`). A plan has
`start_date` (a Monday) and a number of weeks; past its last week there is no current week, and
the app offers to create the next plan. Creating a new plan archives the old one, consistent with
archive-not-delete for assistant-written content. Archived plans stay readable, with their links.

### D-10: Missed items are missed

An item not crossed off by the end of its week does not roll into the next. Rolling over would turn
a bucket into a backlog, and a plan that grows when you fall behind is the wrong pressure.

### D-11: A week review is a fixed-shape summary, not an analysis

`plan_week_review(plan_id, week_index)` returns the same structure every time, so the assistant
reads a week the same way whenever it adjusts a plan. It summarises and does not judge:

- week index, dates, phase, focus, target, and done of target
- items done, each with the session(s) that crossed it off (date, types, duration, RPE)
- items missed
- sessions in the week not linked to the plan
- totals: session count and duration per session type, and per plan category
- fingerboard workouts in the week (protocol, grips, completed)
- injuries logged in the week

Interpretation is left to the assistant. The review is computed, not stored, so it is always
current with edits to sessions.

### D-12: The assistant writes whole plans in one call

`create_plan` takes the full tree: plan, weeks, templates, entries. Building a plan cell by cell
would take dozens of tool calls and leave half-built plans on failure. It runs as one RPC
transaction, like the atomic fingerboard save. Smaller edits (`update_plan`) take a patch of the
same shape: templates and entries to upsert, weeks to change.

## User Stories

### US-001: Plan schema
**Description:** As a developer, I want plan tables with RLS so plans can be stored per user.

**Acceptance Criteria:**
- [x] Tables `training_plans`, `plan_weeks`, `plan_sessions`, `plan_entries`, `plan_completions`
      as in the Data Model, each with `user_id` and RLS (`auth.uid() = user_id`, UPDATE with
      USING and WITH CHECK)
- [x] Partial unique index: one non-archived plan per user
- [x] `start_date` is checked to be a Monday
- [x] pgTAP tests for RLS and the one-active-plan rule
- [x] Typecheck passes

### US-002: Atomic plan create and patch
**Description:** As the assistant, I want to create or change a plan in one transaction so a plan
is never half-written.

**Acceptance Criteria:**
- [x] RPC `create_training_plan(plan JSONB)` creates plan, weeks, templates and entries, archives
      any active plan, and returns the new plan id
- [x] RPC `update_training_plan(plan_id, patch JSONB)` upserts templates and entries and updates
      weeks; an entry with count 0 is removed
- [x] Invalid input (unknown phase or category, week outside the plan) rejects the whole call
- [x] SECURITY INVOKER; pgTAP tests for both
- [x] Typecheck passes

### US-003: Current week RPC
**Description:** As the app and the assistant, I want this week's bucket with done/open state.

**Acceptance Criteria:**
- [ ] RPC `current_plan_week()` returns plan title, week index, phase, target, and the expanded
      bucket items with template, entry note, and linked sessions
- [ ] Returns nothing when no plan is active or today is outside it
- [ ] Wired in `frontend/src/api/` + `types.ts` and `mcp/api.ts` + `types.ts`
- [ ] Typecheck passes

### US-004: MCP plan tools
**Description:** As the assistant, I want to create, read and adjust plans while coaching.

**Acceptance Criteria:**
- [ ] `create_plan`, `get_plan` (whole plan with per-week done counts), `update_plan`
- [ ] `get_week_review` (D-11), defaulting to the last finished week of the active plan
- [ ] `log_session` and `update_session` accept `plan_entry_ids`
- [ ] `get_context` includes the current week's bucket in a compact form
- [ ] Tool descriptions say plan content is Swedish, and point to D-1's bucket model
- [ ] Typecheck passes

### US-005: Week review RPC
**Description:** As the assistant, I want a fixed-shape summary of a plan week to adjust the plan
from.

**Acceptance Criteria:**
- [ ] RPC `plan_week_review(plan_id, week_index)` returns the fields in D-11 as JSON
- [ ] Works for the current week (partial) and past weeks, including on archived plans
- [ ] Wired in `frontend/src/api/` + `types.ts` and `mcp/api.ts` + `types.ts`
- [ ] pgTAP test with done, missed and unplanned sessions
- [ ] Typecheck passes

### US-006: Cross off while logging
**Description:** As a user, when I log a session I want to pick which planned items it covers.

**Acceptance Criteria:**
- [ ] New and edit session forms list the current week's open items as checkboxes
- [ ] Picking an item with default `session_types` prefills the types when they are empty
- [ ] Saving writes the session and its completions together
- [ ] Unlinking an item on edit reopens it
- [ ] Typecheck passes; Vitest covers the picker

### US-007: "Denna vecka" view
**Description:** As a user, I want to see this week's bucket on my phone and what is left.

**Acceptance Criteria:**
- [ ] Shows phase, "X av Y" against the target, done items crossed off with a link to the session
- [ ] Tapping an open item opens the new session form with that item preselected
- [ ] Fingerboard items have "Starta", opening setup with the preset (US-009)
- [ ] The week is visible from the Today page
- [ ] Mobile-first; Swedish UI text
- [ ] Typecheck passes

### US-008: Plan grid editor
**Description:** As a user, I want to reshape a plan: change counts, phases and templates.

**Acceptance Criteria:**
- [ ] Rows are templates grouped by category; columns are weeks with phase and target in the header
- [ ] A cell shows the count and is changed with a stepper or tap; past weeks show done/planned
- [ ] Add, edit and archive templates (title, category, description, default types, preset)
- [ ] Per-week category totals under the grid (D-6)
- [ ] "Kopiera vecka" copies one week's entries onto following weeks
- [ ] Usable on a phone by scrolling horizontally, designed for desktop
- [ ] Saves through `update_training_plan`
- [ ] Typecheck passes

### US-009: Fingerboard preset
**Description:** As a user, I want a planned fingerboard session to start the timer ready to go.

**Acceptance Criteria:**
- [ ] Template form can save the current fingerboard setup shape as its preset
- [ ] "Starta" opens fingerboard setup with the preset; loads come from recommendation
- [ ] The saved workout's session is linked to the entry it was started from
- [ ] Typecheck passes

## Data Model

```
training_plans
  id, user_id, title, goal TEXT NULL, notes TEXT NULL
  start_date        DATE          -- a Monday
  archived_at       TIMESTAMPTZ NULL
  created_at, updated_at

plan_weeks
  id, user_id, plan_id (FK, CASCADE)
  week_index        SMALLINT      -- 1-based
  phase             'volume' | 'strength' | 'endurance' | 'performance' | 'recovery'
  target_count      SMALLINT NULL -- NULL: the whole bucket
  focus             TEXT NULL     -- one line, Swedish
  UNIQUE (plan_id, week_index)

plan_sessions                     -- templates, the grid's rows
  id, user_id, plan_id (FK, CASCADE)
  title             TEXT
  category          see D-7
  description       TEXT NULL     -- Markdown, Swedish
  session_types     TEXT[] DEFAULT '{}'
  fingerboard_preset JSONB NULL   -- D-8
  sort_order        SMALLINT
  archived_at       TIMESTAMPTZ NULL

plan_entries                      -- the grid's cells
  id, user_id, plan_id
  plan_session_id   -- FK (plan_session_id, plan_id) → plan_sessions
  week_index        SMALLINT      -- FK (plan_id, week_index) → plan_weeks
  count             SMALLINT CHECK (count > 0)
  note              TEXT NULL
  UNIQUE (plan_session_id, week_index)

plan_completions
  user_id, session_id (FK sessions, CASCADE), plan_entry_id (FK, CASCADE)
  PRIMARY KEY (session_id, plan_entry_id)
```

## Technical Considerations

- Migrations `20261011000000_training_plans.sql` (tables, RLS) and a second for the RPCs.
- Week arithmetic (which week a date falls in, bucket expansion, done capping) lives in
  `frontend/src/lib/plans/` as pure functions with Vitest coverage; the SQL mirrors it.
- Per the cross-cutting rule, new RPCs touch `frontend/src/api/` + `types.ts` and
  `frontend/supabase/functions/mcp/api.ts` + `types.ts`.
- Fingerboard: the setup page needs to accept a preset and a plan entry id (route state), and
  `save_fingerboard_workout` needs an optional entry id to write the completion in the same
  transaction.
- The grid is the one wide view in the app; a plain table with sticky first column, no grid
  library.

## Success Criteria

- A plan agreed in a conversation lands in the app with one tool call and no hand editing.
- Logging a session crosses off a planned item in one extra tap.
- A planned fingerboard session runs without setting grips or protocol by hand.
- The assistant opens a conversation already knowing what is left of the week.

## Deviations from spec as built

- **`archived_at` instead of `archived BOOLEAN`**, on plans and templates, matching notes and
  journal entries. The one-active-plan index is `WHERE archived_at IS NULL`.
- **No `week_count` column.** A plan's length is its number of `plan_weeks` rows, and the RPC
  checks they run 1..n without gaps. Storing the count too would be a second source of truth.
- **Entries carry `plan_id`.** Composite foreign keys to `plan_sessions (id, plan_id)` and
  `plan_weeks (plan_id, week_index)` make the database itself reject an entry for a week the
  plan does not have, or a template from another plan.
- **`create_training_plan` delegates to `update_training_plan`** for weeks and templates, so both
  share one set of rules. Entry `count` defaults to 1 when omitted.
- **Lowering an entry below its logged sessions is rejected**, rather than cascading and silently
  un-crossing sessions already logged against it.
- **A patch cannot remove weeks.** Weeks are added or changed by number; shortening a plan is not
  supported yet.
- **Migrations were applied with `supabase migration up`**, not `db reset`, to keep local data.

## Open Questions

- None yet. Resolved: missed items do not roll over (D-10); no power phase (D-5); week review
  added (D-11).
