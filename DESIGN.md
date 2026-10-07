---
name: CLedger
description: A personal ledger for climbing, notes and journal, kept together with an AI assistant.
colors:
  ember: "oklch(0.72 0.17 40)"
  ember-chalk: "oklch(0.62 0.19 35)"
  ember-glow: "oklch(0.72 0.17 40 / 0.25)"
  slate-ground: "oklch(0.16 0.018 255)"
  slate-card: "oklch(0.20 0.022 255)"
  slate-card-raised: "oklch(0.235 0.026 255)"
  slate-wash: "oklch(0.27 0.03 255)"
  slate-rule: "oklch(0.305 0.03 255)"
  slate-ink: "oklch(0.95 0.008 255)"
  slate-ink-muted: "oklch(0.73 0.02 255)"
  slate-ink-dim: "oklch(0.55 0.025 255)"
  chalk-ground: "oklch(0.965 0.007 85)"
  chalk-card: "oklch(0.995 0.002 85)"
  chalk-card-raised: "oklch(0.975 0.006 85)"
  chalk-wash: "oklch(0.935 0.011 85)"
  chalk-rule: "oklch(0.885 0.012 85)"
  chalk-ink: "oklch(0.23 0.015 55)"
  chalk-ink-muted: "oklch(0.46 0.015 60)"
  chalk-ink-dim: "oklch(0.63 0.015 70)"
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
  sm: "8px"
  md: "10px"
  lg: "12px"
  card: "14px"
  xl: "16px"
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
    rounded: "{rounded.lg}"
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
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    height: "44px"
  ledger-card:
    backgroundColor: "{colors.slate-card}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.card}"
    padding: "16px 28px"
  ledger-card-hover:
    backgroundColor: "{colors.slate-card-raised}"
  type-pill:
    textColor: "{colors.type-boulder}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  nav-tab:
    textColor: "{colors.slate-ink-muted}"
    rounded: "{rounded.md}"
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

The system is calm by default. Surfaces sit flat and still. Motion is a reply to intent: a card
you can open lifts slightly under the pointer, a pressed control gives a little, and the active
tab highlight slides to where you clicked. Nothing moves on its own, pulses for attention, or
decorates. It is one person's instrument, so density is comfortable rather than airy, and there
is no marketing gloss anywhere inside the app.

**Key Characteristics:**
- Two complete themes, Chalk and Slate, built on the same tokens. Slate is the default.
- One accent (Ember). Every other color is either neutral or encodes a training type or a status.
- Serif for titles and big numbers, sans-serif for everything you read or operate.
- Flat at rest. Depth and motion appear only in response to hover, press or focus.
- A colored left edge is the system's way of saying what kind of thing a card is.

## Colors

Warm-paper or night-slate neutrals carry almost everything. Ember is rare, and training-type hues
appear only as edges, pills and chips.

### Primary
- **Ember** (`ember`, `ember-chalk` in light): the primary button, the focus ring, links in
  notes, checkbox ticks, the left edge of pinned notes and assistant rules, and the diamond in
  the wordmark. Light mode uses a slightly deeper, more saturated ember so it holds contrast on
  paper.
- **Ember Glow** (`ember-glow`): the soft halo under the primary button and the wordmark diamond.
  It is never used as a fill.

### Neutral
- **Slate Ground / Chalk Ground**: the page background.
- **Slate Card / Chalk Card**: cards, inputs, popovers.
- **Card Raised**: a hovered card and nested surfaces, one step above Card.
- **Wash**: secondary and muted fills, the active tab highlight, the ghost button on hover, and
  count chips ("3 kvar").
- **Rule**: borders, input strokes, dividers.
- **Ink / Ink Muted / Ink Dim**: three text levels. Ink for content, Muted for supporting text
  and labels, Dim for timestamps, metadata and inactive chrome such as "Logga ut".

### Training Types
Seven fixed hues, one per session type: **Boulder** (amber), **Routes** (teal), **Board** (blue),
**Hangboard** (straw yellow), **Strength** (brick), **Rehab** (violet), **Other** (Ink Dim). They
appear as a card's left edge, as text on a 15% tint of the same hue in pills, and as the border
and tint of selected filter chips. Each has a light and dark variant, tuned per theme.

### Status
- **Good** (green) and **Bad** (red, shared with Destructive): performance and RPE pills, the
  injury pill, and destructive actions. Two more status pills reuse type hues: "hot" uses Boulder
  and "cold" uses Board.

### Named Rules
**The One Ember Rule.** Ember marks the single most important thing in view: one primary button
per region, the pinned edge, focus. If two things on a screen are both ember and neither is focus,
one of them is wrong.

**The Tint, Never Fill Rule.** Type and status colors are shown as colored text on a ~15%
`color-mix` tint of the same hue, or as a 3px edge. They never appear as solid fills behind white
text.

## Typography

**Display Font:** DM Serif Text (with Georgia, Times New Roman)
**Body Font:** Geist (with ui-sans-serif, system-ui)

**Character:** A bookish, slightly literary serif sits next to a precise, neutral grotesque. The
serif gives the app its ledger voice. Geist keeps every control, label and paragraph quiet and
legible.

### Hierarchy
- **Display** (400, 5.5rem, line-height 1, tabular numerals): the live number in the fingerboard
  workout runner. Large serif numerals appear wherever a number is the point of the screen.
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

## Elevation & Depth

The system is flat at rest and conveys depth through tonal steps (Ground → Card → Card Raised)
and hairline Rule borders. Shadows appear only as a response to interaction, or on things that
truly float. Shadow color is a theme token (`--shadow`): warm brown at 16% on Chalk, black at 45%
on Slate.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 10px 28px var(--shadow)`): a link card under the pointer.
- **Chip lift** (`box-shadow: 0 6px 16px var(--shadow)`): a calendar session chip under the
  pointer.
- **Float** (`box-shadow: 0 10px 30px var(--shadow)`): the fixed theme switcher, the only
  permanently floating element.
- **Ember glow** (`box-shadow: 0 4px 18px var(--glow)`, `0 8px 26px` on hover): the primary
  button only.

### Named Rules
**The Flat-By-Default Rule.** Surfaces sit flat. A shadow means "this responds to you" or "this
floats above the page". Static cards with controls inside (checklists) never lift.

## Shapes

Generously rounded but not bubbly. The radius scale is anchored at 12px (`--radius: 0.75rem`):
8px for small tabs and pills inside dense rows, 10px for nav tabs and icon buttons, 12px for
inputs and outline buttons, 14px for cards, 16px+ for dialogs. Anything that represents a
*choice or an action* (primary, ghost and secondary buttons, type pills, filter chips, the
theme switcher) is a full pill. Containers are rounded rectangles; actions are capsules.

The one sharp-edged mark is the wordmark's ember diamond: a 10px square rotated 45° with 3px
corners.

**The Capsule Means Act Rule.** If it is pill-shaped, you can press it or it labels a
category. Containers never become capsules.

## Components

Quiet at rest. Each component confirms intent with a small, precise response, never with
spectacle.

### Buttons
- **Shape:** full pill (999px) for primary, ghost, secondary and destructive buttons. Outline
  buttons are a 12px rounded rectangle, because they sit beside inputs and share their shape.
- **Primary:** Ember fill, near-white text, Geist 600, 36px tall, 20px horizontal padding, Ember
  Glow beneath.
- **Hover / Press:** the primary rises 2px and its glow widens. Press scales it to 95%. Focus
  shows a 3px ring at 50% Ember.
- **Outline:** a Card fill with a Rule border. On hover the border darkens toward Ink Muted.
  There is no lift.
- **Ghost / Secondary:** transparent or Wash, picking up a Wash fill on hover.

### Chips
- **Type pills:** pill shape, 11px Geist 600, colored text on a 15% tint of the type hue. The
  calendar uses a 9px bold variant.
- **Filter chips (session form):** start neutral (Card fill, Rule border, Ink Muted text). Hover
  tints the border with the type hue and rises 1px. Selected chips take the type hue for text and
  border on a 16% tint. Press scales them to 95%.
- **Status pills:** the same tint recipe with Good, Bad, hot or cold. The injury pill adds a 30%
  hue border.
- **Count chip:** a Wash pill with Ink text, e.g. "3 kvar".

### Cards / Containers
- **Corner Style:** 14px for list cards, 12px for the base ShadCN card.
- **Background:** Card. Card Raised on hover.
- **Border:** a hairline Rule plus a **3px left edge** in the item's accent color: the training
  type for sessions, Ember for pinned notes and assistant rules, Rule otherwise.
- **Shadow Strategy:** flat. Link cards lift (`translate(2px, -2px)` plus Lift shadow) on hover.
  Cards with controls inside (`.is-static`) do not.
- **Internal Padding:** about 16px vertical and 28px horizontal on list cards. Archived items
  drop to 60% opacity.

### Inputs / Fields
- **Style:** 44px tall, Card fill, Rule stroke, 12px radius, 16px horizontal padding. The
  placeholder is Ink Muted. Selected text is Ember with near-white text.
- **Focus:** the border turns Ember with a 3px ring at 50% Ember.
- **Error / Disabled:** errors use a Destructive border and ring. Disabled fields drop to 50%
  opacity.

### Navigation
- **Section tabs:** Geist 500, 14px, Ink Muted text that turns Ink on hover. The active tab gets a
  Wash pill (10px radius) that **slides** between tabs (300ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`)
  via CSS anchor positioning. Where anchors are unsupported, the active tab simply gets a static
  Wash fill. Press scales the tab to 95%.
- **Sub-page tabs:** the same pattern at 8px radius, in a second header row.
- **Mobile:** 24px Lucide icons replace the labels. The title attribute carries the label.

### Ledger Card (signature)
The core repeated unit for sessions, notes and journal entries. A Card with a 3px colored left
edge, a title row (Geist 500 title, inline badges and count chip, a right-aligned Dim timestamp
prefixed "Assistenten ·" when the assistant wrote it), a Muted preview line, and tags. The left
edge is the system's main piece of information design: its color tells you the kind of thing
before you read a word.

### Note Prose
Markdown bodies render with 1.6 line-height, serif headings at weight 400 (1.25 / 1.125 / 1em),
Ember underlined links, Wash code blocks, and a Rule-bordered blockquote. Checklist lines become
flex rows with an 18px native checkbox in Ember. Ticked items turn Muted with a strikethrough.

### Theme Switcher
A fixed pill in the bottom-right corner (Card fill, Rule border, Float shadow) with a tiny "Tema"
label and two swatch toggles, "Ljust" and "Mörkt". It is the only floating chrome.

## Do's and Don'ts

### Do:
- **Do** keep every new color as a token in `src/index.css`, defined for both `:root` (Chalk) and
  `.dark` (Slate).
- **Do** mark a card's kind with the 3px left edge (`session-card` + `accent-*`), not with icons
  or background fills.
- **Do** use DM Serif Text at weight 400 for page titles and headline numbers, with
  `tabular-nums` on any number that updates.
- **Do** tint type and status colors (`color-mix(in oklab, <hue> 15%, transparent)`) and keep
  text in the hue itself.
- **Do** keep motion short (160–300ms) and tied to hover, press or focus, and honor
  `prefers-reduced-motion`. The global rule already does.
- **Do** write all UI text in Swedish.

### Don't:
- **Don't** add a second accent color, or use Ember for decoration, large fills or more than one
  primary action per region.
- **Don't** add ambient or looping motion, entrance choreography or attention pulses. Motion
  answers the user, it never performs. (One approved exception: `trend-pulse` on the dashboard's
  "load increasing" arrow, a repeating opacity fade that flags rising training load. Keep it,
  but don't treat it as precedent. Recharts' one-off draw animation when a chart's data changes
  is fine.)
- **Don't** lift cards that contain controls. Lift is reserved for cards that are links.
- **Don't** put shadows on resting surfaces. Depth at rest comes from Ground → Card → Card Raised.
- **Don't** set buttons, labels or body text in the serif, or bold the serif.
- **Don't** make containers pill-shaped, or make primary actions square.
