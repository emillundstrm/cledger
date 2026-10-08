# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the owner. CLedger is a personal tool. Accounts are invite-only (no self-service
sign-up), and invites exist only to keep others out, not to serve an audience. There are no
other personas to design for.

The owner is a climber who trains on the wall and on a fingerboard, and who works with a
personal AI assistant (Claude) across web, desktop and phone clients. They write in Swedish.

## Product Purpose

CLedger started as a climbing training log. It is now a companion store for a personal AI
assistant: a durable, user-owned place the assistant reads from and writes to over MCP, and that
the owner browses and edits directly in the web app.

It holds:

- **Training**: climbing sessions, fingerboard workouts (hangs, pickups, MVC), injuries, and
  analytics over them.
- **Notes**: memories, conclusions, references, and rules for the assistant (tagged
  `assistant`).
- **Checklists**: todo, shopping and goal-step lists, kept as checkbox lines inside notes.
- **Journal**: diary entries in the owner's own words.

Success means the assistant finds the right note at the right time, and the owner can trust,
read, and correct everything it wrote, without the store ever feeling like a second job.

## Positioning

Retrieval matters more than storage. CLedger is the *only* place the assistant keeps memory
about the owner, so the web app and the assistant are equal partners over the same data: the
owner writes the journal, ticks checklists, and logs training directly, while the assistant
records conclusions and rules. Neither side is a read-only view of the other.

## Operating Context

- **Desktop**: reviewing the dashboard and analytics, editing notes properly, reading what the
  assistant has written.
- **Phone, away from training**: ticking checklists, reading notes, writing journal entries.
- The web UI is not the primary tool at the gym or crag. Mobile layouts still matter (the
  architecture asks for mobile-friendly by default), and session entry should take under two
  minutes with sensible defaults. The owner writes a note for nearly every session, so the note is
  a core field, never hidden. Sessions are rarely shorter than an hour in the hall; injuries are
  the exception, not the rule.
- The assistant connects over a remote MCP server (Supabase Edge Function, OAuth). The owner
  approves each client on the `/oauth/consent` page.

## Capabilities and Constraints

- React + TypeScript + ShadCN UI + Tailwind (Vite), hosted on GitHub Pages under `/cledger`;
  Supabase backend with RLS on every table.
- All app content and UI text is **Swedish**. Code, schema, tool names and PRDs are English.
- Notes can be pinned, tagged, archived and linked (`/notes/<id>`, `/sessions/<id>`,
  `/journal/<id>`). Nothing is deleted through the assistant, only archived. Previous versions of
  notes are kept.
- Search spans notes, checklists and journal.
- Light and dark themes exist; dark is the default (`cledger-theme` in localStorage).
- Out of scope (from `tasks/prd-assistant-companion.md`): data import integrations, recurring
  tasks, reminders, notifications, sharing, attachments, in-app LLM chat.
- Open: the app's name. A rename is explicitly deferred (PRD D-11).

## Brand Commitments

- Name: **CLedger** (provisional, see above).
- Voice: Swedish, concise, no filler. That is how the assistant is told to write, and the UI
  copy should match.

## Evidence on Hand

- Real personal data lives in Supabase (sessions, notes, journal, fingerboard workouts). It is
  private, so never use it as showcase content.
- Feature PRDs: `tasks/prd-assistant-companion.md`, `tasks/prd-fingerboard.md`,
  `tasks/prd-expanded-features.md`.
- No logo, marketing material, testimonials or public audience exist, and none should be
  fabricated.

## Product Principles

1. **One person's instrument.** Design for the owner's habits and density tolerance, not for
   onboarding strangers. No marketing gloss inside the app.
2. **Trust through visibility.** Everything the assistant writes must be easy to see, read, and
   correct, and its origin and history must be legible.
3. **Equal partner, not admin panel.** Journaling, checklists and logging should feel good to do
   by hand, not like editing database rows.
4. **Findability first.** Titles, tags, pins, links and search are core features, not chrome.
5. **Fast capture.** Logging and ticking take seconds. Defaults are pre-filled.
