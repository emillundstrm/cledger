# UI inventory and migration backlog (2026-10-07)

Taken from a read-only sweep of every page. DESIGN.md (Container Model and the named rules) is
the target; this file lists where the code is now. Paths are relative to `frontend/src/`. Line
numbers are from the sweep and will drift.

## Variant counts at sweep time
- Hover treatments: 19.
- Selectable options: 7.
- Static containers: 7.
- Expandable items: 6.
- Page headers: 7.
- Form layouts: 4.
- Filter chips: 5.
- Empty states: 4.
- Container radii: 14 (8, 9, 10, 11, 12, 14, 16, 18, 20px, among others).

## Global primitives to change first
- `components/ui/card.tsx:10`: remove the resting `shadow-sm` and the `rounded-xl` default. Under
  the new model, Card is only for floating surfaces.
- `components/ui/input.tsx:11`, `textarea.tsx:10`, `select.tsx:38`, `button.tsx:17` (outline):
  change from 16px (`rounded-xl`) to 12px.
- `components/ui/toggle.tsx:8` and `ToggleGroupItem`: change from 10px rectangles to pill items,
  and make the selected state Wash.
- `index.css`: remove `.session-card` lift and edge, `.cal-chip` lift and edge, and the
  `.accent-*` edge classes. Add a type-dot style.
- `index.css`: add tokens for warning and for the injury-severity scale. Replace raw Tailwind
  colors at `pages/SessionsPage.tsx:128-143`, `pages/FingerboardPage.tsx:146-151` and
  `components/fingerboard/WorkoutSetup.tsx:576`.

## Lists → list rows in one hairline frame
- Sessions list: `pages/SessionsPage.tsx:155-161`. Uses `.session-card`, a 3px edge and lift.
  Week header at :480.
- Notes list: `components/notes/NoteListItem.tsx:154-170`. A static card whose expand target is
  invisible: no chevron, no hover.
- Note search results: `components/notes/NoteCard.tsx:33-40`, rendered at
  `pages/NotesPage.tsx:191`. A different component for the same item; move it to the note row.
- Journal entries: `components/journal/JournalEntryCard.tsx:244-250`. Lifts but isn't a link, and
  holds buttons. Edit mode at :219-239.
- Fingerboard recent workouts: `pages/FingerboardPage.tsx:182-196`. Closest to the target, but
  they're separate bordered rows instead of one frame. Capped at 10 with no "show more" (:173).
- Asymmetry rows (`pages/FingerboardPage.tsx:141-148`) and backlinks (`pages/NotePage.tsx:197-207`).
- Week and day group headers: three styles today at `pages/SessionsPage.tsx:480` and :328, and
  `components/journal/JournalEntryCard.tsx:188`. Unify them.

## Navigating cards that aren't lists
- Fingerboard protocol picker: `pages/FingerboardPage.tsx:67-75`. Ember border on hover, no lift.
  It is a short list of links, so it becomes rows (or containers with row hover).

## Containers → hairline, no fill
- Dashboard stat tiles and chart cards: `pages/DashboardPage.tsx:125-127, 199, 230, 271`. They use
  20px, `shadow-sm`, and a hover border on non-interactive tiles.
- Already unfilled: `components/fingerboard/BlockEditor.tsx:63`,
  `components/fingerboard/WorkoutSummary.tsx:123`, `components/fingerboard/WorkoutRunner.tsx:195`
  and the maxes table at `pages/FingerboardPage.tsx:95`. Align their radius to 14px and padding to
  20px.
- Timer panel at `components/fingerboard/WorkoutRunner.tsx:133` (18px, tinted). This is a
  status panel; decide whether it is an exception.
- Login and consent cards: `pages/LoginPage.tsx:40`, `pages/OAuthConsentPage.tsx:89`.
- Calendar: the day cell at `pages/SessionsPage.tsx:339-361` holds `.cal-chip` cards at :276-281.
  Make the cell a plain grid cell with tinted chips and no borders. Today is marked with three
  ember treatments (ring, tint, solid pill); reduce that.

## Forms → on the page, label above, one rhythm
- Journal composer: `pages/JournalPage.tsx:54-65` wraps `components/journal/JournalEntryForm.tsx`
  in a Card, with a placeholder-only textarea (:382), and the date sits inline with the buttons
  (:422).
- `components/notes/NoteForm.tsx:93`: native labels with a 6px gap and no max-width. The pin
  control is a native checkbox (:145).
- `components/SessionForm.tsx:127`: closest to the target. Its pill-shaped Avbryt (:307) and lg
  buttons differ from the other forms.
- Login (`pages/LoginPage.tsx:51`) wraps its form in a Card. As an entry page it is a candidate
  exception.

## Selection → tint, pill, one segmented control
- Solid ember "selected": notes filter chips (`pages/NotesPage.tsx:258-268`), the ScalePicker
  (`components/journal/JournalEntryForm.tsx:313-331`), and runner Klarade/Missade
  (`components/fingerboard/WorkoutRunner.tsx:216-239`, which uses the primary button as the
  selected state).
- Ember tint used for status: summary Klarade (`components/fingerboard/WorkoutSummary.tsx:143-156`)
  and attach options (:185-213). These have no hover or focus state.
- Segmented controls come in three looks: view tabs (`pages/SessionsPage.tsx:424-451`), the
  SessionForm performance picker (`components/SessionForm.tsx:213-226`), and the Dashboard metric
  toggle (`pages/DashboardPage.tsx:237-247`). Volym, Stil and Prestation
  (`components/fingerboard/WorkoutSetup.tsx:305-346`,
  `components/fingerboard/WorkoutSummary.tsx:243-262`) are 10px toggles.
- Load-mode radio cards (`components/fingerboard/WorkoutSetup.tsx:400-429`) show no selected state
  on the card.
- The "show archived" toggle is a FilterChip in Notes (`pages/NotesPage.tsx:146`) but a native
  checkbox in Journal (`pages/JournalPage.tsx:68-75`).
- RPE value shown as a solid ember pill: `components/SessionForm.tsx:192`.

## Page headers → one component
- FB workout uses an icon back button and an `h1` at 2xl
  (`pages/FingerboardWorkoutPage.tsx:576-584`). Every other page uses an `h2` at 4xl.
- Back link missing on edit session, new note, note edit and new session. Journal entry has no
  title (`pages/JournalEntryPage.tsx:157`).
- Fingerboard section headings and protocol names are `h2`, the same level as the page title
  (`pages/FingerboardPage.tsx:74, 86, 168`).
- Page rhythm varies: `space-y-4` (Dashboard, with an `mb-7` hack), 6, 7 and 9.

## Destructive
- Confirm actions use ember: `pages/EditSessionPage.tsx:101`, `pages/NotePage.tsx:236`,
  `pages/FingerboardPage.tsx:306`, `pages/FingerboardWorkoutPage.tsx:636`,
  `components/notes/NoteForm.tsx:177`.
- Header triggers are solid destructive: `pages/EditSessionPage.tsx:91`.

## States
- Fingerboard workouts have no loading or error state, so the empty copy flashes while loading
  (`pages/FingerboardPage.tsx:47, 170`). Its dashed empty box is at :90.
- Journal entry treats not-found as an error (`pages/JournalEntryPage.tsx:152-154`).
- Error placement differs: above the form in `pages/NewSessionPage.tsx:32`, below it in
  `pages/NewNotePage.tsx`. Only Notes offers a retry.

## Smaller items
- Focus rings are missing on SessionRow, NoteCard, protocol cards, calendar chips, workout rows
  and summary options.
- Glyphs are mixed: a "›" text character vs Lucide chevrons, and ▸/▾ vs ChevronDown.
- Pill sizes differ within one session row (`pages/SessionsPage.tsx:178, 187, 201`).
- Card padding differs: sessions use 16px horizontal, notes and journal 28px.
