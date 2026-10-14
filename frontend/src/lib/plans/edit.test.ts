import { describe, expect, it } from "vitest"
import type { PlanSession, PlanWeek } from "@/api/types"
import { formatWeeks, targetError, weekDraft, weekPatch } from "./edit"

const week: PlanWeek = {
    week: 2, startDate: "2026-10-19", phase: "strength", focus: "Tungt",
    targetCount: 2, plannedCount: 3, doneCount: 1,
}

function session(id: string, entries: PlanSession["entries"], extra: Partial<PlanSession> = {}): PlanSession {
    return {
        id, title: id, category: "strength", description: null, sessionTypes: [],
        fingerboardPreset: null, sortOrder: 0, archived: false, entries, ...extra,
    }
}

const sessions = [
    session("moon", [{ id: "e1", week: 2, count: 2, note: "Fler försök", doneCount: 1 }], { sortOrder: 1 }),
    session("run", [{ id: "e2", week: 1, count: 1, note: null, doneCount: 0 }], { sortOrder: 0 }),
    session("old", [{ id: "e3", week: 2, count: 1, note: null, doneCount: 0 }], { archived: true }),
]

describe("formatWeeks", () => {
    it("joins consecutive weeks into ranges", () => {
        expect(formatWeeks([5, 1, 2, 3, 8, 9])).toBe("1–3, 5, 8–9")
        expect(formatWeeks([4])).toBe("4")
    })
})

describe("weekDraft", () => {
    it("lists every active session in order, at 0 when it is not in the week", () => {
        expect(weekDraft(week, sessions)).toEqual({
            phase: "strength",
            target: "2",
            focus: "Tungt",
            sessions: [
                { sessionId: "run", count: 0, note: "" },
                { sessionId: "moon", count: 2, note: "Fler försök" },
            ],
        })
    })
})

describe("weekPatch", () => {
    it("sends the week's fields and only the sessions that changed", () => {
        const draft = weekDraft(week, sessions)
        draft.target = ""
        draft.sessions[0].count = 1
        expect(weekPatch(week, sessions, draft)).toEqual({
            weeks: [{ week: 2, phase: "strength", targetCount: null, focus: "Tungt" }],
            sessions: [{ id: "run", entries: [{ week: 2, count: 1, note: null }] }],
        })
    })

    it("removes a session from the week at count 0", () => {
        const draft = weekDraft(week, sessions)
        draft.sessions[1].count = 0
        expect(weekPatch(week, sessions, draft).sessions).toEqual([
            { id: "moon", entries: [{ week: 2, count: 0, note: "Fler försök" }] },
        ])
    })
})

describe("targetError", () => {
    it("takes a blank target or a whole number up to the planned count", () => {
        const draft = weekDraft(week, sessions)
        expect(targetError({ ...draft, target: "" })).toBeUndefined()
        expect(targetError({ ...draft, target: "2" })).toBeUndefined()
        expect(targetError({ ...draft, target: "3" })).toMatch(/fler än/)
        expect(targetError({ ...draft, target: "1,5" })).toMatch(/heltal/)
    })
})
