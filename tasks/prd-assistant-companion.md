# PRD: Assistant Companion

## Introduction

CLedger started as a climbing training log and is now mostly used through an LLM over MCP. In
those conversations the assistant often reaches conclusions that are worth keeping — about
recovery, sleep, Garmin trends, life in general — but the only free-text place it can write to is
`coach_insights`, which is framed as training advice. Conclusions that do not fit end up as
mis-filed insights, or as memory files on one machine.

This epic broadens CLedger into a **companion app for a personal AI assistant**: a durable,
user-owned store the assistant reads from and writes to, and that the user can browse and edit
directly. Training logging stays exactly as it is. Alongside it come three new primitives:
**notes** (memories, conclusions, rules for the assistant), **tasks** (todo lists), and
**journal entries** (a diary).

The organising idea is that **retrieval matters more than storage**. A memory store is only
useful if the assistant finds the right note at the right time, so search and a cheap "what
should I know right now" entry point are designed in from the first phase rather than bolted on.

## Goals

- Give the assistant a correct place to record any conclusion, not just training ones.
- Keep todo lists and a diary in the same store, reachable from the same MCP connection.
- Make everything findable by search across notes, tasks and journal.
- Let a new conversation start with relevant context in one small tool call.
- Keep the user in control: everything the assistant writes is visible and editable in the UI.
- Make CLedger the **only** place the assistant keeps memory, replacing local memory files.
- Prepare for using the store from any Claude client, not only this machine.

## Non-Goals (this epic)

- No integrations that pull data in (Garmin, calendar, email). The assistant reads those through
  their own MCP servers and records conclusions here.
- No recurring tasks, reminders or notifications.
- No sharing or multi-user collaboration.
- No attachments or images.
- No in-app chat with an LLM. The app is the store; the assistant lives in the Claude client.
- No i18n framework. The UI is switched to Swedish directly (see D-2).
- No protection against a deliberately destructive agent (see D-7).
- Choosing a new name for the app (see D-11).

## Design Decisions

### D-1: Three primitives, not one generic table and not one table per idea

| Primitive         | Covers                                                   | Table             |
|-------------------|----------------------------------------------------------|-------------------|
| Notes             | Memories, conclusions, references, assistant guidance    | `notes`           |
| Tasks             | Todo lists                                               | `tasks`           |
| Journal entries   | Diary                                                    | `journal_entries` |

A single `entries` table with a JSON payload would lose types and constraints, and make the UI
generic in an unhelpful way. A table per concept ("shopping lists", "health notes", "book notes")
grows without bound. These three cover nearly everything an assistant writes down; finer
distinctions are made with tags.

### D-2: Content in Swedish, code in English

The user writes their own entries in Swedish. Frontier models perform measurably but only
slightly worse in Swedish than in English, and read mixed-language context without trouble, so
model quality is not the deciding factor — what the user will naturally write is. A diary that
has to be translated in your head is a diary that stops being written.

| Layer                                         | Language |
|-----------------------------------------------|----------|
| Code, schema, MCP tool names, reserved tags, PRDs | English  |
| Content (notes, tasks, journal)               | Swedish  |
| UI strings                                    | Swedish  |

The MCP server instructions tell the assistant to write content in Swedish. Existing English
insights are translated during curation (D-10). Climbing vocabulary will remain mixed ("crimp",
"projekt", "RPE") regardless, which constrains the search design (D-4).

### D-3: Notes are freely tagged, with one reserved tag

No fixed categories. A note has `tags TEXT[]`, and the UI and MCP tools list existing tags so
they converge rather than drift (`träning` vs `traning`). `pinned` marks notes that matter
enough to be listed in every context. `source` records whether the user or the assistant wrote
it, which matters when judging how much to trust a note later.

Notes fall into two kinds that behave differently: **facts about the user** ("left shoulder
flares on steep compression") and **rules for the assistant** ("keep check-ins short", "confirm
a symptom actually limited a session before it changes the plan"). Facts are relevant only to
some conversations; rules apply to all of them. Rules carry the reserved tag `assistant` and are
always loaded in full by `get_context` (D-6). The tag is a technical identifier, so it is English
like the rest of the schema.

`title` is required for notes created through MCP and the UI, because `get_context` lists pinned
notes by title (D-6). It is nullable in the database only so the mechanical insight migration
(D-5) can run before curation gives every note a title.

### D-4: Search is language-neutral, one RPC across all primitives

Postgres full-text search stems with one language configuration. With mixed Swedish and English
content, either choice breaks matches in the other language. Phase 1 therefore uses:

- no language-specific stemming, so it works for both languages
- `pg_trgm` `word_similarity` per query word, threshold 0.5 — catches inflections, compounds and
  typos (`klättring` ~ `klättrade`, `sömn` ~ `sömnkvalitet`)

A document's score is the mean of its best match per query word, so documents matching more of
the query rank higher. Search scans the user's rows rather than using an index: per-word
`word_similarity` cannot use a trigram index, and one person's notes are too few for it to matter.

A single `search(query, kinds, limit)` RPC returns ranked hits from notes, tasks and journal
entries with a common shape (`kind`, `id`, `title`, `snippet`, `date`, `tags`, `score`).
Multilingual embeddings via `pgvector` are the planned upgrade if keyword search proves too
literal; the RPC signature is designed so that change is internal.

### D-5: `coach_insights` is migrated mechanically, then curated by hand

The migration copies each insight into `notes` with `tags = '{training}'`,
`source = 'assistant'`, and original `pinned` and timestamps, then drops `coach_insights` in the
same transaction, so there is never a period with two sources of truth. The Insights page becomes
the Notes page; the insight MCP tools are replaced by the note tools (D-6); `get_training_summary`
reads pinned notes tagged `training` instead.

The migration deliberately does not translate, shorten or split anything. That is judgement
work, done interactively in the curation phase (D-10) once tasks and journal exist as places for
the pieces to go.

### D-6: A small MCP tool surface, and a small `get_context`

Adding a handful of tools per primitive would roughly triple the tool count and make tool choice
harder for the model. Instead:

| Tool            | Purpose                                                    |
|-----------------|------------------------------------------------------------|
| `get_context`   | What to know at the start of a conversation (below)        |
| `search`        | The D-4 RPC                                                |
| `get_note`      | Full content of one note, including the notes it links to  |
| `remember`      | Create a note                                              |
| `update_note`   | Edit title, content, tags, pinned; or archive              |
| `list_notes`    | Filter by tag, pinned, date; returns titles and snippets   |
| `add_task`      | Create a task in a list                                    |
| `update_task`   | Edit, complete, reopen, archive                            |
| `list_tasks`    | Filter by list and status                                  |
| `write_journal` | Create a journal entry (defaults to today)                 |
| `list_journal`  | Entries in a date range                                    |

`get_context` is called at the start of every conversation, so its size is a cost paid every
time. Today `list_insights` returns about 13 insights in full, one of them ~6k characters. The
rule is: **full text only for rules; everything else as pointers**.

| Section     | Content                                                               |
|-------------|-----------------------------------------------------------------------|
| Rules       | Notes tagged `assistant`, full content                                |
| Pinned      | Title, id and tags of pinned notes; filtered by `tags` if given       |
| Tasks       | Overdue and due within 7 days (max 10), plus open count per list      |
| Journal     | Date and first line of the last 3 entries                             |
| Tags        | All tags in use with counts                                           |

An optional `tags` parameter narrows the pinned section, so the training plan is listed when
the conversation is about training and not when it is about the calendar. Rules are never
filtered. Full text of anything else comes from `get_note` or `search`. The exact shape is
expected to change with use; it is one function and nothing else depends on it.

The server's `instructions` field carries the routing guidance: call `get_context` first, what
goes in a note versus a journal entry versus a training session, that rules get the `assistant`
tag, that content is written in Swedish, to search before creating a near-duplicate, and to
**rewrite an outdated note rather than append corrections to it**.

### D-7: Archive instead of delete, and keep revisions

Two failure modes, handled differently:

- **Mistakes.** The assistant over-eagerly removes something, or rewrites a note and loses
  what was there. MCP tools can archive (`archived_at`) but not delete; archived items are hidden
  from `get_context`, lists and search by default, and can be restored or permanently deleted in
  the UI. Because D-6 asks the assistant to rewrite outdated notes in place, overwriting is the
  *more* likely way to lose something, so a trigger copies the previous version of a note into
  `note_revisions` on every update.
- **A deliberately destructive agent.** Not addressed. The MCP server authenticates as the user,
  and the user's credentials can delete anything through PostgREST regardless of which tools are
  exposed. The real protection against that is backups, which are outside this epic.

The revisions trigger ships in phase 1 even though the UI to browse and restore revisions comes
later, because history can only be collected from the moment the trigger exists. It costs one
table and one trigger.

### D-8: Links are Markdown in the text, not a table

Notes can link to other notes, sessions, tasks and journal entries with ordinary Markdown links
to the app's own routes:

```markdown
Se [axellärdomar](/notes/3f2a…) och passet [2026-09-14](/sessions/91bc…).
```

No link table is needed. Paths are relative to the app root (without the GitHub Pages base path),
so they survive a rename. The UI renders note, task and journal content as Markdown and turns
these into in-app links. `get_note` parses them out and returns the linked items' ids, kinds and
titles, so the assistant can follow them without guessing. Backlinks ("what links here") are a
plain text search for the id, which the D-4 indexes already make cheap.

A link to a deleted item renders as plain text with a "missing" marker rather than a broken link.

### D-9: Journal allows many entries per day

An entry has an `entry_date DATE` (the day it is about, defaulting to today) and `created_at` (when
it was written). Several short entries per day are normal. Optional `mood` and `energy` (1–5) are
included because they are cheap and correlate usefully with training data; both are nullable and
never required.

### D-10: Curation and import is an interactive phase, after the store is complete

Two bodies of existing memory need moving in, and both need judgement rather than a script:

- **Migrated insights.** Translate to Swedish, cut the wordiness, give each a title, and split
  where an insight is really several things — a task, a journal entry, a fact, a rule.
- **The coach's Claude Code memory files**
  (`~/.claude/projects/-home-emill-workspace-coach/memory/`). These are exactly the
  machine-bound memory this epic exists to replace: rules like "don't inflate minor symptoms" and
  "session notes are route names only", and facts like the shoulder lessons.

This runs as a session between the user and an agent after phase 3, so tasks and journal exist
as destinations. Afterwards CLedger must be the **only** memory store, otherwise the assistant
saves to two places that drift apart: Claude Code's auto-memory is turned off for the coach
project, and its `CLAUDE.md` states that CLedger is where memory lives.

### D-11: Remote MCP comes later; nothing before it depends on the name

The MCP server is stdio-only today and authenticates with credentials from environment variables,
so it only works from Claude clients on this machine. That is acceptable for now — the Garmin MCP
has the same limitation — but the goal is to reach the store from any client. Phase 5 moves the
server to Streamable HTTP with OAuth so it can be added as a remote connector.

Renaming touches the repo, MCP server name, GitHub Pages URL and page title. Phases 1–4 do not
depend on the name, but phase 5 publishes a URL and connector name that are configured in each
client, so **the name must be decided before phase 5**. The rename itself is executed in phase 6.

To keep phase 5 cheap, `mcp-server/src/api.ts` stays transport-agnostic: tool handlers never read
environment variables or assume stdio.

## Phases

1. **Notes** — schema, revisions trigger, insight migration, search, MCP tools, Notes page
   (US-001 – US-006)
2. **Tasks** — schema, MCP tools, task list UI (US-007 – US-009)
3. **Journal** — schema, MCP tools, journal UI (US-010 – US-012)
4. **Curation and import** — interactive session, single memory store, revision UI
   (US-013 – US-014)
5. **Remote MCP** — HTTP transport and auth (US-015)
6. **Restructure and rename** — navigation, Today page, Swedish UI, new name (US-016 – US-018)

## User Stories

### US-001: Notes schema, revisions and insight migration
**Description:** As a user, I want my existing insights preserved as notes, and every later edit
recoverable, so nothing is lost when insights are generalised.

**Acceptance Criteria:**
- [x] `notes` and `note_revisions` tables per the Data Model, with RLS per project rules
- [x] An `AFTER UPDATE` trigger on `notes` inserts the previous title, content and tags into
      `note_revisions` when any of them changed
- [x] `note_revisions` has SELECT and INSERT policies only; no UPDATE policy
- [x] Every `coach_insights` row is copied to `notes` with `tags = '{training}'`,
      `source = 'assistant'`, and original `pinned`, `created_at`, `updated_at`
- [x] `coach_insights` is dropped in the same migration
- [x] `npx supabase db reset` succeeds
- [x] Typecheck passes

### US-002: Search across everything
**Description:** As the assistant, I want one search call across notes, tasks and journal, so I
can find what the user told me before regardless of where it was stored.

**Acceptance Criteria:**
- [x] `search(query, kinds, limit, include_archived)` RPC, SECURITY INVOKER
- [x] Matches Swedish inflections and minor typos via trigram similarity
- [x] Returns `kind`, `id`, `title`, `snippet`, `date`, `tags`, `score`, ranked by score
- [x] Archived items excluded unless requested
- [x] Wired into frontend and MCP per the cross-cutting RPC rule
- [x] Tests cover a Swedish inflection match and a mixed-language match

### US-003: Note MCP tools
**Description:** As the assistant, I want to record and revise conclusions as notes, so they
survive beyond the conversation.

**Acceptance Criteria:**
- [x] `remember`, `get_note`, `update_note`, `list_notes`, `search` tools per D-6
- [x] `remember` requires a title
- [x] `update_note` can archive but no tool can delete (D-7)
- [x] `get_note` returns ids, kinds and titles of items linked from the note (D-8)
- [x] `list_insights`, `add_insight`, `update_insight` are removed
- [x] `get_training_summary` includes pinned notes tagged `training`
- [x] Notes created via MCP have `source = 'assistant'`

### US-004: Context and routing guidance
**Description:** As the assistant, I want to load what matters at the start of a conversation
cheaply and know where things belong, so I stop mis-filing conclusions as training insights.

**Acceptance Criteria:**
- [x] `get_context(tags?)` returns rules in full, and pinned notes as title, id and tags
      (tasks added in phase 2, journal in phase 3)
- [x] `tags` filters pinned notes but never rules
- [x] Server `instructions` cover everything listed under D-6
- [x] With the current 13 insights migrated, `get_context` output is under 2k characters
      excluding rules

### US-005: Markdown content and links
**Description:** As a user, I want notes rendered as Markdown with working links to other
notes and sessions, so related things are one tap apart.

**Acceptance Criteria:**
- [x] Note content renders as Markdown
- [x] Links to `/notes/…`, `/sessions/…`, `/tasks/…`, `/journal/…` navigate within the app
- [x] Links to missing items render as plain text with a marker
- [x] A note shows the notes that link to it
- [x] Rendering is sanitised; raw HTML in content is not executed

### US-006: Notes page
**Description:** As a user, I want to browse, search, edit, tag, pin, archive and delete notes in
the app, so I can see and correct what the assistant remembers.

**Acceptance Criteria:**
- [x] Insights page and route replaced by Notes (`/notes`, `/notes/:id`, with `/insights`
      redirecting)
- [x] Filter by tag; search box uses the search RPC
- [x] Tag input suggests existing tags
- [x] Shows whether a note was written by the user or the assistant
- [x] Rules (tag `assistant`) are visually distinguished
- [x] Archived notes behind a toggle; permanent delete only for archived notes
- [x] Tests cover create, edit, archive, delete
- [x] Typecheck and lint pass

### US-007: Tasks schema
**Acceptance Criteria:**
- [x] `tasks` table per the Data Model, with RLS
- [x] `completed_at` is set when status becomes `done` and cleared on reopen
- [x] Tasks included in the search RPC

### US-008: Task MCP tools
**Description:** As a user, I want to ask the assistant to add, complete and list todos, so todo
lists live in the same place as everything else.

**Acceptance Criteria:**
- [x] `add_task`, `update_task`, `list_tasks` per D-6
- [x] `list` defaults to `inbox` when unspecified
- [x] `get_context` includes tasks per D-6
- [x] Archive but no delete via MCP

### US-009: Tasks page
**Acceptance Criteria:**
- [x] Lists shown as tabs or a picker; one tap to complete
- [x] Quick add with list and optional due date
- [x] Completed tasks collapsed below open ones
- [x] Tests cover add, complete, reopen
- [x] Typecheck and lint pass

### US-010: Journal schema
**Acceptance Criteria:**
- [x] `journal_entries` table per the Data Model, with RLS
- [x] Multiple entries per `entry_date` allowed
- [x] Journal entries included in the search RPC

### US-011: Journal MCP tools
**Description:** As a user, I want to dictate a diary entry to the assistant, or have it look back
over a period with me.

**Acceptance Criteria:**
- [x] `write_journal`, `list_journal` per D-6; `entry_date` defaults to today
- [x] `get_context` includes journal per D-6

### US-012: Journal page
**Acceptance Criteria:**
- [x] Entries grouped by day, newest first, rendered as Markdown
- [x] Writing an entry takes one tap from the page; mood and energy optional
- [x] Days with training sessions show a link to them
- [x] Typecheck and lint pass

### US-013: Curate insights and import coach memory
**Description:** As a user, I want my old insights and the coach's local memory files moved into
CLedger in Swedish, trimmed and split into the right primitives, so all memory lives in one place.

**Acceptance Criteria:**
- [ ] Every migrated insight is translated, given a title, and kept, split into
      notes/tasks/journal entries, or archived — reviewed together with the user
- [ ] Every memory file in the coach project is imported as a note (rules tagged `assistant`) or
      deliberately dropped
- [ ] Claude Code auto-memory is turned off for the coach project, and its `CLAUDE.md` names
      CLedger as the only memory store
- [ ] The local memory files are removed once imported

### US-014: Revision history in the UI
**Acceptance Criteria:**
- [ ] A note shows its previous versions with timestamps
- [ ] Any revision can be restored (which itself creates a revision)

### US-015: Remote MCP
**Description:** As a user, I want to reach my store from any Claude client, including my phone.

**Acceptance Criteria:**
- [ ] MCP server served over Streamable HTTP, deployable without this machine
- [ ] OAuth-based auth resolving to a Supabase user, so RLS still applies
- [ ] stdio transport still works for local use
- [ ] App name decided before this story starts (D-11)

### US-016: Navigation for a broader app
**Acceptance Criteria:**
- [ ] Training (sessions, fingerboard, dashboard) grouped as one area among Notes, Tasks, Journal
- [ ] Works on a phone without horizontal scrolling

### US-017: Today page
**Description:** As a user, I want one page showing what matters today.

**Acceptance Criteria:**
- [ ] Shows open tasks due today or overdue, today's journal entries, pinned notes, and today's
      or the most recent training
- [ ] Becomes the index route

### US-018: Swedish UI and rename
**Acceptance Criteria:**
- [ ] All UI strings in Swedish
- [ ] Repo, MCP server name, Pages base path and title updated to the new name

## Data Model

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,  -- required by MCP and UI; nullable only for migrated insights (D-3)
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'assistant')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE note_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()  -- when this version was replaced
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list TEXT NOT NULL DEFAULT 'inbox',
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'assistant')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT current_date,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
    energy SMALLINT CHECK (energy BETWEEN 1 AND 5),
    source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'assistant')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes: `(user_id, updated_at DESC)` for list queries; `(note_id, created_at DESC)` on revisions;
GIN on `tags`. No full-text or trigram index (see D-4).

## Technical Considerations

- `current_date` is evaluated in the database's time zone (UTC). The client should send
  `entry_date` explicitly so late-evening entries land on the right local day.
- `pg_trgm` must be enabled in a migration; it is available on hosted Supabase.
- Do not apply `unaccent` to search: in Swedish å/ä/ö are distinct letters (`får` ≠ `far`).
- Rules (tag `assistant`) are loaded in full every conversation, so they should stay short. The
  Notes page can show their combined length as a gentle nudge.
- Markdown rendering must not execute raw HTML from content; the assistant writes it, and
  the assistant may have read untrusted text.

## Success Criteria

- The assistant no longer files non-training conclusions as training insights.
- A conclusion recorded in one conversation is found by search in a later one.
- Todos and diary entries are added through the assistant without opening the app.
- After curation, no assistant memory lives outside CLedger.

## Deviations from spec as built

- **Phase 1:** `get_training_summary` reads pinned notes tagged `training` *or* `träning`, so
  curation can move the tag to Swedish without breaking it.
- **Phase 1:** Search results in the Notes page show title, snippet and tags, but not pinned,
  archived or source, because the `search` RPC returns a shape common to all kinds.
- **Phase 1:** Sessions have no view page, so `/sessions/<id>` redirects to the session editor.
- **Phase 1:** The "under 2k characters" check in US-004 was verified on test data only. Migrated
  insights have no titles until curation, so `get_context` lists them by an 80-character preview.

- **Phase 2:** For tasks, search returns the list name in `tags`, since tasks have no tags.
- **Phase 2:** `/tasks/<id>` opens the Tasks page with all lists shown and that task expanded,
  rather than a separate task page.
- **Phase 2:** On phones the app name is hidden next to the logo mark, to fit six nav icons. The
  real navigation rework is still US-016.
- **Phase 3:** An `update_journal_entry` MCP tool was added beyond D-6, so the assistant can fix
  or archive an entry it wrote; like the others, it cannot delete.
- **Phase 3:** `get_context` also returns `today`, the user's local date, since journal and task
  dates are relative to it.
- **Phase 3:** The journal loads 30 days at a time ("Show older"). Tag suggestions come from the
  entries loaded, not from a dedicated RPC.
- **Phase 3:** Only notes keep revision history; tasks and journal entries do not.

## Open Questions

- New app name (must be decided before phase 5).
