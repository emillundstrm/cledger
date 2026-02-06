# PRD: Expanded Features

## Introduction

This epic adds new features to CLedger beyond the core MVP functionality. These features enhance the user experience and provide more powerful ways to visualize and understand training data.

## Goals

- Improve session visualization with alternative views
- Make it easier to spot training patterns over time
- Maintain the clean, simple UI aesthetic

## User Stories

### US-001: Calendar view for sessions
**Description:** As a user, I want to view my sessions in a calendar format so I can easily see my training patterns week by week and spot gaps or overtraining.

**Acceptance Criteria:**
- [x] Sessions page has two icon buttons (left of "Log Session") to toggle between list and calendar view
- [x] Calendar view displays one week per row
- [x] Each day cell shows the venue (if set) and session types (as icons or abbreviated labels)
- [x] Calendar view does not show the intensity/performance/productivity scores (keep it clean)
- [x] Clicking a session in calendar view navigates to the session detail/edit page
- [x] Days without sessions are shown as empty cells
- [x] Current day is visually highlighted
- [x] View preference persists (localStorage) so returning users see their preferred view
- [x] Calendar view is responsive on mobile (may need horizontal scroll or condensed display)
- [x] Typecheck passes

### US-003: Training load metric on dashboard
**Description:** As a user, I want to see my training load over time so I can understand if I'm training too much, too little, or at a sustainable level.

**Training Load Formula:**
- Load = Duration (minutes) × Intensity Factor
- Intensity factors: Easy = 1, Moderate = 2, Hard = 3
- Example: 90min hard session = 90 × 3 = 270 load points

**Acceptance Criteria:**
- [x] Dashboard shows weekly training load for the last 8 weeks (bar chart or line chart)
- [x] Training load calculation implemented as Supabase RPC function
- [x] Sessions without duration are excluded from load calculation (or use a sensible default)
- [x] Current week's load shown as a summary card (e.g., "This week: 450 load")
- [x] Visual indication of load trend (increasing/decreasing/stable)
- [x] Typecheck passes

**Future Enhancement (not in scope):**
- User-specific training capacity setting
- Load vs capacity comparison with warnings for overtraining

### US-004: Dashboard chart layout improvements
**Description:** As a user, I want related charts displayed side by side so I can compare metrics more easily and the dashboard uses screen space efficiently.

**Acceptance Criteria:**
- [x] Weekly Sessions and Weekly Training Load charts are displayed side by side on wider screens
- [x] Charts stack vertically on narrow screens (responsive)
- [x] Layout matches the existing Performance/Productivity trend chart pairing
- [x] Typecheck passes

### US-002: Injury severity tracking
**Description:** As a user, I want to log the severity of injuries so I can distinguish between minor tweaks and serious issues, and get better insights about my injury patterns.

**Severity Scale:**
| Level | Name | Description |
|-------|------|-------------|
| 1 | Tweak | Slight discomfort, no training modifications needed. May notice soreness after. |
| 2 | Minor | Noticeable during training, but can continue normally with awareness. |
| 3 | Moderate | Requires modifications - avoid certain holds/movements or reduce intensity. |
| 4 | Limiting | Significantly restricted - can do some training (e.g., legs/core) but not full climbing. |
| 5 | Severe | Complete rest required. No training until healed. |

**Acceptance Criteria:**
- [x] Database migration adds `severity` column (integer 1-5) to `session_injuries` table
- [x] Injury form includes severity dropdown with the 5 levels (name + short description)
- [x] Severity is optional for backwards compatibility (existing injuries remain valid)
- [x] Injury displays show severity with color coding (green→yellow→orange→red→dark red)
- [x] Dashboard "Injuries (Last 30 Days)" factors in severity (e.g., weighted count or separate breakdown)
- [x] MCP `log_injury` tool accepts optional severity parameter
- [x] MCP `list_injuries` returns severity in response
- [x] Typecheck passes

### US-005: Calendar icons
**Description:** As a user, I want the switcher between list and calendar view to look and feel more like tabs.

**Acceptance Criteria:**
- [x] Switcher uses ShadCN tabs component
- [x] Switcher uses same icons as before - list and calendar lucide icons
- [x] Clicking the calendar tab changes to the calendar view
- [x] Clicking the list tab changes to the list view
- [x] Typecheck passes

## Non-Goals

- No drag-and-drop session rescheduling (sessions are logged after the fact)
- No future date planning or scheduling
- No month view (week rows are sufficient for now)

## Technical Considerations

- Use existing ShadCN components where possible
- Session types could be shown as small colored dots or abbreviated text (e.g., "B" for boulder, "R" for routes)
- Consider using CSS grid for the calendar layout
- Week should start on Monday (standard for training calendars)

## Success Metrics

- Users can quickly see their training frequency patterns
- Calendar view loads quickly even with many sessions
