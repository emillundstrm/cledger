import type { PlanPhase, PlanSession, PlanWeek, TrainingPlanPatch } from "@/api/types"

/** "1–3, 5": week numbers as ranges. */
export function formatWeeks(weeks: number[]): string {
    const sorted = [...new Set(weeks)].sort((a, b) => a - b)
    const ranges: string[] = []
    let start = sorted[0]
    for (let i = 1; i <= sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
            const end = sorted[i - 1]
            ranges.push(start === end ? `${start}` : `${start}–${end}`)
            start = sorted[i]
        }
    }
    return ranges.join(", ")
}

/** The plan's sessions in their order, active ones first. */
export function sortedSessions(sessions: PlanSession[]): PlanSession[] {
    return [...sessions].sort((a, b) => Number(a.archived) - Number(b.archived) || a.sortOrder - b.sortOrder)
}

/** One session's line in the week editor. */
export interface WeekSessionDraft {
    sessionId: string
    count: number
    note: string
}

export interface WeekDraft {
    phase: PlanPhase
    /** As typed; blank means the whole bucket. */
    target: string
    focus: string
    sessions: WeekSessionDraft[]
}

/** The editor's starting state for a week: every active session, at 0 when it is not in the week. */
export function weekDraft(week: PlanWeek, sessions: PlanSession[]): WeekDraft {
    return {
        phase: week.phase,
        target: week.targetCount !== null ? String(week.targetCount) : "",
        focus: week.focus ?? "",
        sessions: sortedSessions(sessions)
            .filter((session) => !session.archived)
            .map((session) => {
                const entry = session.entries.find((e) => e.week === week.week)
                return { sessionId: session.id, count: entry?.count ?? 0, note: entry?.note ?? "" }
            }),
    }
}

/** The fewest a session's count can go to in a week: what is already done there. */
export function minCount(session: PlanSession, week: number): number {
    return session.entries.find((e) => e.week === week)?.doneCount ?? 0
}

export function plannedTotal(draft: WeekDraft): number {
    return draft.sessions.reduce((sum, s) => sum + s.count, 0)
}

/**
 * The patch that saves a week's draft: the week's own fields, and an entry for
 * each session whose count or note changed. A count of 0 removes the entry.
 */
export function weekPatch(week: PlanWeek, sessions: PlanSession[], draft: WeekDraft): TrainingPlanPatch {
    const before = new Map(weekDraft(week, sessions).sessions.map((s) => [s.sessionId, s]))
    const changed = draft.sessions.filter((s) => {
        const old = before.get(s.sessionId)
        return old === undefined || old.count !== s.count || (s.count > 0 && old.note !== s.note)
    })

    return {
        weeks: [
            {
                week: week.week,
                phase: draft.phase,
                targetCount: draft.target.trim() !== "" ? Number(draft.target) : null,
                focus: draft.focus.trim() || null,
            },
        ],
        sessions: changed.map((s) => ({
            id: s.sessionId,
            entries: [{ week: week.week, count: s.count, note: s.note.trim() || null }],
        })),
    }
}

/** What is wrong with a typed target, or undefined. */
export function targetError(draft: WeekDraft): string | undefined {
    const value = draft.target.trim()
    if (value === "") {
        return undefined
    }
    const target = Number(value)
    if (!Number.isInteger(target) || target < 1) {
        return "Ange ett heltal, eller lämna tomt för alla pass."
    }
    if (target > plannedTotal(draft)) {
        return "Målet kan inte vara fler än de planerade passen."
    }
    return undefined
}
