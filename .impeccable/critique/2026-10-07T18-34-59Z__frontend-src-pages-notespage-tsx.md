---
target: notes
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/emill/workspace/cledger/frontend/src/pages/NotesPage.tsx"
target_fingerprint: "sha256:0d2875b07ed419b9216c7f80d023fa63715bcd433993c174168d18a1ec0ca393"
target_path: /home/emill/workspace/cledger/frontend/src/pages/NotesPage.tsx
timestamp: 2026-10-07T18-34-59Z
slug: frontend-src-pages-notespage-tsx
closed: true
---
# Critique: Notes (frontend/src/pages/NotesPage.tsx and related)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Ticks save silently; failed save is one line at page top (NotesPage.tsx:151) |
| 2 | Match System / Real World | 3 | Good Swedish vocabulary; raw English `assistant` tag shows as a chip |
| 3 | User Control and Freedom | 2 | Avbryt/back discard edits; ticked item vanishes, no undo |
| 4 | Consistency and Standards | 2 | List cards expand, search hits navigate; pressed chips are solid ember |
| 5 | Error Prevention | 2 | Disabled save has no reason; no unsaved-changes guard |
| 6 | Recognition Rather Than Recall | 3 | Linking requires typing /notes/<id> from memory |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts; pin only via edit form |
| 8 | Aesthetic and Minimalist Design | 3 | Unbounded chip row; full timestamps everywhere |
| 9 | Error Recovery | 1 | Generic "Kunde inte …", no retry; not-found and load error merged |
| 10 | Help and Documentation | 2 | Only Markdown placeholder; no preview |
| Total | | 22/40 | Acceptable |

## Design Specificity Verdict
About half specific to CLedger: rules as their own collapsed class, inline-tickable checklists, backlinks and "(saknas)" dead links. The core relationship (assistant writes, owner checks and corrects) is nearly invisible: dim "Assistenten ·" prefix, version history never shown, pins and rules share the ember edge. Detector: clean (0 findings).

## Priority Issues
- [P1] What the assistant writes and changes is nearly invisible. Only creator is recorded; search hits hard-code fromAssistant/pinned=false (NotesPage.tsx:165-167); versions have no UI. Fix: "Assistenten"/"Sedan sist" view, "uppdaterad av assistenten", Historik with diff, pass source+pinned through search. Command: shape, then clarify.
- [P1] Edits and ticks can be lost without warning. No unsaved-changes guard on Avbryt/back; edit mode isn't a route; failed tick reverts silently and errors at page top; ticked item vanishes. Fix: discard confirmation + route guard, /notes/:id/edit route, inline error with "Försök igen", "Bockad · Ångra". Command: harden.
- [P1] Text contrast fails. Dim on Card 3.74:1 dark / 3.46:1 light (timestamps, "Assistenten"); near-white on Ember 2.57:1 dark / 3.85:1 light (primary button, pressed chips). Muted on Card is 7.58:1. Fix: adjust Dim or use Muted for attribution; dark text on Ember or deeper Ember fill; pressed chips as tint per DESIGN.md. Command: audit, then colorize.
- [P2] Filter row has no structure and search ignores it. One unbounded row mixing Listor, tags, Arkiverade, expand-all (10-17 options); search ignores Listor while pressed (NotesPage.tsx:87-89); search hits use a different card. Fix: segmented Alla/Listor/Regler/Assistenten, top ~6 tags + "Fler taggar", "Visa arkiverade" switch, same card + filters for search. Command: distill.
- [P2] Checklists hard to tap and confusing for screen readers. 18px checkbox, item text not tappable; aria-label is raw Markdown (NoteMarkdown.tsx:69); chips ~22px, add field 32px. Fix: label-wrapped 44px rows, stripped aria-label, larger hit areas. Command: adapt.

## Persona Red Flags
- Alex: no `/`, Esc or `n` shortcuts; no search clear; pin via Redigera; links typed as /notes/<uuid>; required title; no Ctrl+Enter.
- Sam: Dim contrast; Markdown checkbox names; no focus ring on chips/expand-all; errors not announced; card button named by title only; ▸/▾ read aloud.
- Casey: 18px tap target; mis-tap hides item; errors at page top; theme switcher where the thumb lands; expanding pushes target away.
- Owner reviewing the assistant: no "changed this week"; misleading "uppdaterad"; no history/diff; rules take two clicks; search drops attribution; raw Markdown editing in 180px textarea, no preview.

## Minor Observations
Absolute timestamps; no break-words on long titles; misleading empty state when filtered; edit mode loses heading and back link; new note ignores active tag; ember dilution; no expand chevron; no h1; backlinks silently exclude archived.

## Questions to Consider
- Should the default view be "Sedan sist"?
- Should rules get their own page?
- Does a required title fit "Fast capture"?
