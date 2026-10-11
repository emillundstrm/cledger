import type { CurrentPlanWeek, PlanCategory } from "@/api/types"

/** A planned session the session form can offer: one per entry, however many slots it has. */
export interface PickableEntry {
    entryId: string
    title: string
    category: PlanCategory
    sessionTypes: string[]
    /** Times planned this week. */
    count: number
    /** Slots not yet crossed off by another session. */
    open: number
    /** This session already crosses it off. */
    linked: boolean
}

/**
 * The entries of a week a session can cross off: those with an open slot, and
 * those this session already crosses off (so editing can unpick them). A
 * session crosses an entry off at most once, so an entry planned twice is
 * offered once.
 */
export function pickableEntries(week: CurrentPlanWeek, sessionId?: string): PickableEntry[] {
    const byEntry = new Map<string, PickableEntry>()
    for (const item of week.items) {
        let entry = byEntry.get(item.entryId)
        if (!entry) {
            entry = {
                entryId: item.entryId,
                title: item.title,
                category: item.category,
                sessionTypes: item.sessionTypes,
                count: 0,
                open: 0,
                linked: false,
            }
            byEntry.set(item.entryId, entry)
        }
        entry.count += 1
        if (item.sessionId === null) {
            entry.open += 1
        } else if (item.sessionId === sessionId) {
            entry.linked = true
        }
    }
    return [...byEntry.values()].filter((e) => e.open > 0 || e.linked)
}

/** How many items the week asks for: its target, or the whole bucket. */
export function weekGoal(week: Pick<CurrentPlanWeek, "targetCount" | "plannedCount">): number {
    return week.targetCount ?? week.plannedCount
}
