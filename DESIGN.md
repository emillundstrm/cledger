---
name: CLedger
description: A personal ledger for climbing, notes and journal, kept together with an AI assistant.
colors:
  ember: "oklch(0.72 0.17 40)"
  ember-chalk: "oklch(0.54 0.19 35)"
  ember-glow: "oklch(0.72 0.17 40 / 0.25)"
  slate-ground: "oklch(0.16 0.018 255)"
  slate-card: "oklch(0.20 0.022 255)"
  slate-wash: "oklch(0.27 0.03 255)"
  slate-rule: "oklch(0.305 0.03 255)"
  slate-ink: "oklch(0.95 0.008 255)"
  slate-ink-muted: "oklch(0.73 0.02 255)"
  slate-ink-dim: "oklch(0.645 0.025 255)"
  chalk-ground: "oklch(0.965 0.007 85)"
  chalk-card: "oklch(0.995 0.002 85)"
  chalk-wash: "oklch(0.935 0.011 85)"
  chalk-rule: "oklch(0.885 0.012 85)"
  chalk-ink: "oklch(0.23 0.015 55)"
  chalk-ink-muted: "oklch(0.46 0.015 60)"
  chalk-ink-dim: "oklch(0.52 0.015 70)"
  good: "oklch(0.80 0.14 150)"
  bad: "oklch(0.72 0.17 25)"
  type-boulder: "oklch(0.78 0.14 55)"
  type-routes: "oklch(0.78 0.13 165)"
  type-board: "oklch(0.75 0.12 245)"
  type-hangboard: "oklch(0.83 0.13 95)"
  type-strength: "oklch(0.72 0.16 25)"
  type-rehab: "oklch(0.74 0.13 310)"
typography:
  display:
    fontFamily: "DM Serif Text, Georgia, Times New Roman, serif"
    fontSize: "5.5rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "DM Serif Text, Georgia, Times New Roman, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "DM Serif Text, Georgia, Times New Roman, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  control: "10px"
  row: "12px"
  card: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "24px"
  page-gutter: "16px"
  page-gutter-wide: "24px"
  page-top: "36px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.chalk-card}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.slate-card}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.slate-wash}"
  input:
    backgroundColor: "{colors.slate-card}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.row}"
    padding: "8px 16px"
    height: "44px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.row}"
    padding: "12px 16px"
  list-row-hover:
    backgroundColor: "{colors.slate-wash}"
  container:
    backgroundColor: "transparent"
    rounded: "{rounded.card}"
    padding: "20px"
  segmented-item-selected:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.pill}"
  type-pill:
    textColor: "{colors.type-boulder}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  nav-tab:
    textColor: "{colors.slate-ink-muted}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
  nav-tab-active:
    backgroundColor: "{colors.slate-wash}"
    textColor: "{colors.slate-ink}"
---

# Design System: CLedger

## Overview

**Creative North Star: "The Chalked Ledger"**

CLedger looks like a well-kept personal book. Headings are set in a calm serif, as if written
into a ledger, and everything else is quiet sans-serif working text. The page is either warm
paper (**Chalk**, light) or cool night slate (**Slate**, dark, the default). A single ember accent
marks what matters: the primary action, a pinned note, the field you are typing in. Training
types carry their own soft colors, so a week of sessions reads as a color-coded record you can
scan at a glance.

The system is calm by default. Surfaces are outlined, not filled: lists are rows inside a
hairline frame, and containers are hairline boxes on the page itself. Motion is a reply to
intent: a row you can open takes a soft wash under the pointer and its chevron nudges, a pressed
control gives a little, and the active tab highlight slides to where you clicked. No surface lifts,
nothing moves on its own, nothing decorates. It is one person's instrument, so density is
comfortable rather than airy, and there is no marketing gloss anywhere inside the app.

**Key Characteristics:**
- Two complete themes, Chalk and Slate, built on the same tokens. Slate is the default.
- One accent (Ember). Every other color is either neutral or encodes a training type or a status.
- Serif for titles and big numbers, sans-serif for everything you read or operate.
- Outlined, never stacked: rows in hairline frames, hairline containers, no box inside a box.
- A training type is named in its own hue; selection is a tint, never a solid fill.

## Colors

Warm-paper or night-slate neutrals carry almost everything. Ember is rare, and training-type hues
appear only as edges, pills and chips.

### Primary
- **Ember** (`ember`, `ember-chalk` in light): the primary button, the focus ring, links in
  notes, the filled part of on/quantity controls (checkbox ticks, slider range and thumb), and
  the diamond in the wordmark. Light mode uses a slightly deeper, more saturated ember so it holds contrast on
  paper.
- **Ember Glow** (`ember-glow`): the soft halo around the wordmark diamond.
  It is never used as a fill.

### Neutral
- **Slate Ground / Chalk Ground**: the page background.
- **Slate Card / Chalk Card**: inputs and floating surfaces (dialogs, popovers, the theme
  switcher). Never rows or containers.
- **Wash**: the highlighted item in a popover or command list, the hover background of rows, the selected item of segmented controls, the active
  tab highlight, the ghost button on hover, and count chips ("3 kvar").
- **Rule**: borders, input strokes, dividers.
- **Ink / Ink Muted / Ink Dim**: three text levels. Ink for content, Muted for supporting text
  and labels, Dim for timestamps, metadata and inactive chrome such as "Logga ut".

### Training Types
Seven fixed hues, one per session type: **Boulder** (amber), **Routes** (teal), **Board** (blue),
**Hangboard** (straw yellow), **Strength** (brick), **Rehab** (violet), **Other** (Ink Dim). They
appear as text on a 15% tint of the same hue in type pills, as the type's name in its hue on a
calendar day, as one bar segment per type where a calendar day is too narrow for words, and as the
border and tint of selected filter chips. A multi-type session shows every type in its own hue,
never one type's color for the whole session. Each has a light and dark variant, tuned per theme.

### Status
- **Good** (green) and **Bad** (red, shared with Destructive): performance and RPE pills, the
  injury pill, and destructive actions. Two more status pills reuse type hues: "hot" uses Boulder
  and "cold" uses Board.
- **Warning** (amber) and the injury-severity scale are status colors too, and are defined as
  tokens like the rest: never raw Tailwind palette colors in components.

### Named Rules
**The One Ember Rule.** Ember marks the single most important thing in view: one primary button
per region, and focus. Selected states, today's date, values and badges are not that thing. If two
things on a screen are both ember and neither is focus, one of them is wrong. The running hang in
the Workout Runner is the one surface-sized exception: there, the hang *is* the most important
thing in view.

**The On-State Exception.** A control that is *on* or *filled* may carry Ember in its mark: a
checked checkbox's tick box, a switch that is on, a slider's range and thumb, and a neutral
filter or scope chip that is pressed (an active filter changes what the page shows, and must not
be missable). The mark is small or a tint, never a solid fill, so it never competes with the
primary button's filled pill. A *choice* among several options (segmented controls, option cards,
radios, the journal's 1–5 scales) is not an on-state and stays neutral (see The One Field Surface
Rule). Type chips keep their own hue.

**The Legible Hue Rule.** Every text color clears 4.5:1 on Ground, Card, Wash and a hovered row,
in both themes, including type and status hues on their own 15% tint; focus rings and chart marks
clear 3:1. The two themes are tuned separately: on Chalk the hues sit darker (lightness about
0.48–0.52, chroma lowered where the gamut demands) than on Slate. Check a new color against all
four surfaces before using it.

**The Tint, Never Fill Rule.** Selection, type and status are shown as colored text on a ~15%
`color-mix` tint of the same hue (or Wash, for neutral choices), or as colored text. They never
appear as solid fills behind white text. The only solid fill is the primary button.

## Typography

**Display Font:** DM Serif Text (with Georgia, Times New Roman)
**Body Font:** Geist (with ui-sans-serif, system-ui)

**Character:** A bookish, slightly literary serif sits next to a precise, neutral grotesque. The
serif gives the app its ledger voice. Geist keeps every control, label and paragraph quiet and
legible.

### Hierarchy
- **Display** (400, 5.5rem, line-height 1, tabular numerals): big serif numbers wherever a number
  is the point of the screen. The one exception is the running workout's countdown, read from the
  floor two metres away: it scales with the viewport and screen height,
  `clamp(5rem, min(32vw, 20dvh), 11rem)` (see Workout Runner).
- **Headline** (400, 2.25rem): the page title, one per page ("Fingerträning", a note's title).
- **Title** (400, 1.125–1.5rem, tracking −0.025em): section headings and stat values on the
  dashboard. The wordmark is 21px serif.
- **Body** (Geist 400, 0.875rem, line-height 1.6 in prose): UI text, card previews, note bodies.
  Inputs are 16px on mobile to prevent iOS zoom, and 14px from `md` up.
- **Label** (Geist 600, 10–11px, uppercase, tracking 0.08–0.12em): week headers, weekday
  initials, dashboard stat captions, note badges ("Fäst", "Arkiverad"), and the "Tema" caption.

### Named Rules
**The Serif Is Ink Rule.** The serif is for titles and meaningful numbers only, always at weight
400. It never appears in buttons, inputs, labels or running text. Headings inside note prose also
use the serif at 400.

**The Small Caps Ceiling Rule.** Uppercase tracked labels never go above 11px. They caption
things and never compete with titles.

## Layout

- **Container:** a single centered column, max 1240px wide, with 16px gutters (24px from `sm`).
  Main content starts 36px below the header and keeps 80px of bottom padding, so the floating
  theme switcher never covers the last item.
- **Header:** sticky, 58px tall, frosted (`backdrop-blur-xl` over 85% Ground), with a hairline
  bottom rule. Wordmark on the left, section tabs, and "Logga ut" on the right. The active
  section's pages appear as a second 44px tab row inside the same header.
- **Rhythm:** a 4px base. Tight groups use 4–8px (`gap-1`/`gap-2`), list items and card internals
  12px (`gap-3`, `space-y-3`), and page sections 24–28px (`space-y-6`/`space-y-7`). Narrow forms
  and dialogs cap at `max-w-lg`/`max-w-2xl`.
- **Responsive:** mobile-first. Below `sm`, section tabs collapse to 24px icons, centered in the
  header, and "Logga ut" becomes an icon. Lists stay single-column. The sessions calendar keeps a
  seven-column grid with compact 9px type pills.
- **Scrollbar:** `scrollbar-gutter: stable` keeps pages from shifting sideways.
- **Page change:** a cross-fade view transition (100ms out, 200ms in).
- **Page rhythm:** one vertical rhythm for every page: 28px between page sections (`space-y-7`),
  12px inside a group. A page starts with the page header (see Components).

### Container Model
Every surface is exactly one of these. Pick by what it holds, not by how it should look.

1. **List** (many similar items: sessions, notes, journal entries, workouts, backlinks, search
   results): **list rows** inside one hairline frame, separated by hairline dividers. Groups
   (a week, a day) get a group header above their frame.
2. **Container** (a standalone group of content or controls: dashboard tiles, a fingerboard
   block, the workout record panel, a notice): a **hairline box**, no fill, 14px radius, 20px
   padding.
3. **Form** (fields to fill in): on the page background, never inside a box. See Forms.
4. **Floating** (dialogs, popovers, the theme switcher): Card fill plus the Float shadow. The only
   filled surfaces.

**The No Nesting Rule.** A bordered or filled surface never sits inside another one. Inside a
container or row, structure comes from spacing, dividers and type, never from another box. A
calendar day is a plain grid cell; the sessions in it are tinted chips without borders.

**The One Item, One Look Rule.** The same kind of item looks and behaves the same everywhere it
appears. A note in search results is the same row as a note in the list.

## Elevation & Depth

The system is flat. Nothing lifts, not even the primary button. Depth comes from hairline Rule borders on the page background,
and a Wash background answers hover. Shadows exist only on things that truly float above the
page. Shadow color is a theme token (`--shadow`): warm brown at 16% on Chalk, black at 45% on
Slate.

### Shadow Vocabulary
- **Float** (`shadow-float`: `0 10px 30px var(--shadow)`): dialogs, popovers, selects, chart
  tooltips and the fixed theme switcher, all on Card fill.
- **Ember glow** (`box-shadow: 0 0 12px var(--glow)`): the wordmark diamond only.

### Named Rules
**The Flat Rule.** No resting shadows on cards, rows or containers (ShadCN Card's default
`shadow-sm` is removed), and no lift on hover. A shadow means "this floats above the page".

## Shapes

Four radii and the pill, nothing else:

- **10px (`control`)**: icon buttons, nav tabs, small controls inside rows.
- **12px (`row`)**: list frames and rows, and fields: inputs, textareas, select triggers, and the
  buttons that act as fields (date picker, combobox).
- **14px (`card`)**: containers, dialogs.
- **Pill**: anything you press to act or choose (every button variant, segmented
  controls and their items, choice and filter chips, type pills, the theme switcher).

The one sharp-edged mark is the wordmark's ember diamond: a 10px square rotated 45° with 3px
corners.

**The Capsule Means Act Rule.** If it is pill-shaped, you can press it or it labels a
category. Containers and rows are never capsules, and choices are never rectangles.

## Components

Quiet at rest. Each component confirms intent with a small, precise response, never with
spectacle.

### Buttons
- **Shape:** every button is a full pill (999px), so a row of buttons never mixes shapes. Only
  a button that stands in for a field (the date picker, a combobox) breaks this: it uses the
  `field` variant, which gives it the whole field surface (below), not just the 12px radius.
- **Primary:** Ember fill, Geist 600 text in near-white on Chalk and Slate Ground (dark ink) on
  Slate, so the label clears 4.5:1 in both themes, 36px tall, 20px horizontal padding, no shadow.
- **Hover / Press:** the primary's fill steps toward more contrast with its label
  (darker on Chalk, brighter on Slate). Press scales it to 95%. Focus
  shows a 3px ring at 80% Ember.
- **Outline:** a Card fill with a Rule border. On hover the border darkens toward Ink Muted. There
  is no lift.
- **Ghost / Secondary:** transparent or Wash, picking up a Wash fill on hover.

### List Rows (signature)
The core repeated unit for sessions, notes, journal entries, workouts and search results.
- **Frame:** a group of rows shares one hairline frame (12px radius, no fill), rows separated by
  hairline dividers.
- **Row:** 12px vertical and 16px horizontal padding. The
  title (Geist 500), inline badges and count chip, a right-aligned Dim timestamp prefixed
  "Assistenten ·" when the assistant wrote it, and a Muted preview line.
- **Navigating row:** the whole row is the link; a ChevronRight at the end.
- **Expanding row:** the whole header is the button, `aria-expanded`; a ChevronDown at the end
  that rotates when open. The expanded body stays inside the same row, with no box around it.
- **Hover:** Wash background, chevron nudges 2px (navigating) or holds (expanding). No lift, no
  border change.
- **Focus:** a visible focus ring (`ring-ring/80`, 3px) on the row's interactive element.
- **Rows with controls** (checklists) keep the same look; the controls take their own hover.
- **Archived** items drop to 60% opacity.

### Containers
- Hairline Rule border, no fill, no shadow, 14px radius, 20px padding.
- A title, when present, is Title type or a Label caption at the top.
- Static: no hover treatment.
- A notice (warning, info) is a container whose border and text take the status color on a 5–8%
  tint.

### Fields
Everything you type into or pick a value from: inputs, textareas, selects, the date-picker
trigger, the weight stepper.
- **Surface:** Card fill, Rule border, 12px radius, 44px tall, 16px horizontal padding. Text 16px
  on mobile (so iOS doesn't zoom), 14px from `md` up. Placeholder in Ink Muted.
- **Focus:** the border turns Ember with a 3px ring at 80% Ember.
- **Invalid:** `aria-invalid` gives a Bad border and ring; the message sits under the field
  (FormField's `error`) and is tied to it with `aria-describedby`.
- **Disabled:** 50% opacity.
- **Buttons as fields:** the date-picker trigger and comboboxes use Button's `field` variant, so
  they share the height, padding, text size and placeholder color of an input. Never an outline
  pill with a radius override.
- **Sliders:** a Wash track, an Ember range and a 20px Ember thumb ringed in Ground (see The
  On-State Exception), with a 44px touch target around it. The value itself, shown beside the
  label, stays a neutral Wash pill.

**The One Field Surface Rule.** Fields share one surface, Card fill and a Rule border. Choices
(segmented controls, chips, option cards, radios) are transparent with a Rule border, and selected
means a Wash fill only: never a brighter border, never Ember. A radio's dot is Ink. The exceptions
are chips: a pressed type chip takes its hue, a pressed filter chip takes Ember (The On-State
Exception). Two controls
that look alike behave alike, and a control's surface tells you which kind it is.

### Selection Controls
- **Segmented control** (2–4 exclusive choices: view tabs, performance, metric, volume, style):
  a pill track with a hairline border, items as pills, the selected item on Wash (sliding pill
  where anchors are supported). One component for all of them.
- **Choice chips** (several options, often multi-select: session types, tags, filters): pill,
  transparent with a hairline border and Ink Muted text. Selected: the hue's text and border on a
  15% tint (the type hue for types). A pressed neutral filter or scope chip (ChoiceChip) takes an
  Ember border on a 10% Ember tint with Ink text: Ember text on that tint misses 4.5:1 on Chalk. Hover tints
  the border. Press scales to 95%.
- **Option cards** (a choice that needs a description: load mode, where to log a workout): a
  container-shaped option with a radio; selected takes a Wash fill; the border stays Rule.
- **Toggles for scope** (show archived, and similar): a switch-style choice chip with the same
  look in every list, never a bare native checkbox.
- Never a solid fill for "selected", and never the primary button as a selected state.

### Pills and Badges
- **Type pills:** pill shape, 11px Geist 600, colored text on a 15% tint of the type hue.
- **Status pills:** the same recipe with Good, Bad, Warning, hot or cold. The injury pill adds a
  30% hue border.
- **Count chip:** a Wash pill with Ink text, e.g. "3 kvar".
- One size for all inline pills in a row: 11px, 2px by 10px padding.

### Calendar
The sessions calendar is a month, like a wall calendar: weeks run top to bottom (past at the top
left, future at the bottom right), days Monday to Sunday, the ISO week number in a narrow first
column.
- **Grid:** one hairline frame (12px radius); faint lines (Rule at 60%) between days and weeks. A
  day is a plain cell, never a box: the grid lines are the structure.
- **Header:** the month as a Title (serif), its session count in Dim, then "Idag", ‹ and ›.
- **Day:** the date at the top left, Muted; days outside the month at 45% opacity; today's date
  on a Wash circle.
- **Session:** a Wash-tinted entry naming each type in its own hue ("Boulder · Board"), venue
  below in Muted. Below `sm`, a thin bar with one colored segment per type. Always a link with the
  full description as its accessible name.

### Forms
- On the page background, max width `max-w-2xl`.
- Label above the field (ShadCN `Label`, 14px Geist 500), 8px between label and field, 24px
  between fields (`space-y-6`). Placeholder text never replaces a label; a visually hidden label
  is allowed only for a single-field form whose purpose is obvious (search, add item).
- Optional or advanced fields sit behind a quiet text disclosure. A group of details opens with
  a chevron toggle (the journal's "Humör, energi, taggar"); a section that may simply be absent
  is a muted "+ Skada" style link that disappears once the section opens, moving focus into it.
  Either opens by itself when editing something that already has content there.
- Button row at the bottom, left-aligned, 8px gap: the primary submit, then an outline "Avbryt"
  of the same height. Default size.
- Errors: under the field they concern when they are about one field, otherwise directly above
  the button row, `role="alert"`, 14px Bad text.

### Page Header
- One component: optional back link ("← Parent", 14px Muted, above the title) on every child
  page, the title (Headline serif, `h1`), an optional one-line Muted subtitle, and at most one
  primary action at the right.
- Section headings within a page are Title type (`h2`), never the page-title size.

### Navigation
- **Section tabs:** Geist 500, 14px, Ink Muted text that turns Ink on hover. The active tab has a
  Wash pill (10px radius) that slides between tabs (300ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`) via
  CSS anchor positioning, or a static Wash fill where anchors are unsupported, and carries
  `aria-current="page"`. Press scales the tab to 95%.
- **Sub-page tabs:** the same pattern at 8px radius, in a second header row.
- **Mobile:** 24px Lucide icons replace the labels; `aria-label` carries the label.
- **Header:** sticky, above everything that scrolls (`z-20`).

### States
- **Loading:** a Muted line naming what loads ("Laddar pass…"), or a row-shaped placeholder in a
  list frame.
- **Error:** Bad text naming what failed, plus an outline "Försök igen" when retrying can help,
  `role="alert"`.
- **Empty:** Muted text in the list's place saying what will appear here, with one ghost action
  when there is something to do (e.g. "Rensa filter"). No boxed or dashed empty states.
- **Not found:** Muted text and a back link (it is not an error).

### Destructive Actions
- One style everywhere: the `destructive` button, Bad text and a Bad border at 40% on no fill,
  with a 10% Bad wash on hover. There is no solid red button.
- It is used for the trigger ("Ta bort permanent") and for the confirming action in its dialog
  ("Ta bort", "Släng ändringarna"). Ember never confirms a destructive action.
- When the destructive choice is one alternative among others ("Avsluta passet?": keep going,
  save what's done, or discard), it stands apart on the left, and the safe, likely choice keeps
  the primary.

### Note Prose
Markdown bodies render with 1.6 line-height, serif headings at weight 400 (1.25 / 1.125 / 1em),
Ember underlined links, Wash code blocks, and a Rule-bordered blockquote. Checklist lines become
flex rows with an 18px native checkbox in Ember. Ticked items turn Muted with a strikethrough.

### Theme Switcher
A fixed pill in the bottom-right corner (Card fill, Rule border, Float shadow) with a tiny "Tema"
label and two swatch toggles, "Ljust" and "Mörkt". It is the only floating chrome outside
dialogs and popovers, and it hides while the workout runner fills the screen.

### Workout Runner
The one screen read from a distance: the phone lies on the floor while you hang. It breaks
several page rules on purpose, and only here.
- **Full screen:** once started, the runner covers the app (header, nav and theme switcher
  included); the page beneath goes inert and doesn't scroll. Before starting, and in the summary
  after, it is an ordinary page.
- **The hang is Ember:** while a hang or lift runs, the whole surface turns Ember with Primary
  Foreground ink, the one filled surface in the app. Rests, the countdown before a set, and a
  paused clock are on Ground, so a colour change from across the room means "hang now", and a
  stopped clock never looks like a running one.
- **On the Ember surface,** outline buttons drop their fill and take the surface's ink for text,
  border, hover and focus ring (an Ember ring on Ember would vanish).
- **Reading order, by size:** the phase and the countdown carry the screen; everything else
  stays at sizes that keep each line whole on a phone. The phase ("Häng", "Lyft", "Vila",
  "Pausad", with the hand after it when alternating) is 3–3.75rem serif; the countdown is
  `clamp(5rem, min(32vw, 20dvh), 11rem)`, capped by height so a short phone keeps the set question
  in view; then "Set 3 av 10" (with the rep in a repeater) at 18px, Geist 600; the grip and edge
  at 24px serif; the total load at 3rem serif. "Byt vikter" is a full-width warning notice at
  24px, Geist 600. Bigger text for the set, grip or notice was tried and rejected: it broke
  lines like "Mittre två, crimp · 20 mm" in unnatural places.
- **Between sets** the runner asks "Hur gick set N?" with the same Klarade/Missade pair the summary
  uses, for every protocol; a max test also shows the load stepper.
- **Controls:** Pausa/Fortsätt (56px, full width) and the sound toggle sit at the bottom within
  thumb reach. "Hoppa över" can't be undone, so it sits in the top bar beside "Avsluta", away from
  Pausa. "Avsluta" pauses the clock while its save/continue/discard dialog is open. Space pauses
  and resumes from a keyboard.

## Do's and Don'ts

### Do:
- **Do** keep every new color as a token in `src/index.css`, defined for both `:root` (Chalk) and
  `.dark` (Slate).
- **Do** classify every surface by the Container Model (list, container, form, floating) before
  styling it.
- **Do** show a session's training types and other facts with pills; nothing leads the title.
- **Do** use DM Serif Text at weight 400 for page titles and headline numbers, with
  `tabular-nums` on any number that updates.
- **Do** tint selection, type and status colors (`color-mix(in oklab, <hue> 15%, transparent)`)
  and keep text in the hue itself.
- **Do** give every interactive surface a visible `focus-visible` ring.
- **Do** keep motion short (160–300ms) and tied to hover, press or focus, and honor
  `prefers-reduced-motion`. The global rule already does.
- **Do** write all UI text in Swedish.

### Don't:
- **Don't** put a box inside a box: no bordered or filled surface inside a container, row or card.
- **Don't** fill containers or rows with Card color. Card fill is for floating surfaces only.
- **Don't** lift anything on hover, or put resting shadows on cards, rows or containers.
- **Don't** use a thick colored side border or a leading dot to mark an item's kind. Use a pill
  or a badge.
- **Don't** add a second accent color, or use Ember for decoration, selected choices, today's
  date, or more than one primary action per region. On-state marks and pressed filters are the
  exceptions.
- **Don't** show "selected" as a solid fill or as a primary button.
- **Don't** add ambient or looping motion, entrance choreography or attention pulses. Motion
  answers the user, it never performs. (One approved exception: `trend-pulse` on the dashboard's
  "load increasing" arrow, a repeating opacity fade that flags rising training load. Keep it,
  but don't treat it as precedent. Recharts' one-off draw animation when a chart's data changes
  is fine.)
- **Don't** put a form inside a card, or replace its labels with placeholders.
- **Don't** confirm a destructive action with an ember button.
- **Don't** set buttons, labels or body text in the serif, or bold the serif.
- **Don't** make containers or rows pill-shaped, or make choices or primary actions square.
