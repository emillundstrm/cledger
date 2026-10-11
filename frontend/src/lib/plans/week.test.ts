import { describe, expect, it } from "vitest"
import type { CurrentPlanWeek, PlanWeekItem } from "@/api/types"
import { pickableEntries, weekGoal } from "./week"

function item(entryId: string, slot: number, sessionId: string | null, title = entryId): PlanWeekItem {
    return {
        entryId,
        planSessionId: `t-${entryId}`,
        title,
        category: "strength",
        description: null,
        sessionTypes: ["board"],
        fingerboardPreset: null,
        note: null,
        slot,
        sessionId,
        sessionDate: sessionId ? "2026-10-13" : null,
    }
}

function week(items: PlanWeekItem[], targetCount: number | null = null): CurrentPlanWeek {
    return {
        planId: "p",
        planTitle: "Höstblock",
        week: 1,
        weekCount: 4,
        startDate: "2026-10-12",
        endDate: "2026-10-18",
        phase: "strength",
        focus: null,
        targetCount,
        plannedCount: items.length,
        doneCount: items.filter((i) => i.sessionId !== null).length,
        items,
    }
}

describe("pickableEntries", () => {
    it("offers an entry planned twice once, with its open slots", () => {
        const entries = pickableEntries(week([item("moon", 1, "s1"), item("moon", 2, null)]))
        expect(entries).toHaveLength(1)
        expect(entries[0]).toMatchObject({ entryId: "moon", count: 2, open: 1, linked: false })
    })

    it("leaves out entries another session has fully crossed off", () => {
        const entries = pickableEntries(week([item("run", 1, "s1"), item("moon", 1, null)]))
        expect(entries.map((e) => e.entryId)).toEqual(["moon"])
    })

    it("keeps an entry this session crosses off, so it can be unpicked", () => {
        const entries = pickableEntries(week([item("run", 1, "s1")]), "s1")
        expect(entries).toEqual([expect.objectContaining({ entryId: "run", linked: true, open: 0 })])
    })
})

describe("week goal", () => {
    it("is the whole bucket without a target", () => {
        const w = week([item("a", 1, null), item("b", 1, null)])
        expect(weekGoal(w)).toBe(2)
    })

    it("is the target when there is one", () => {
        const w = week([item("a", 1, null), item("b", 1, null), item("c", 1, null)], 2)
        expect(weekGoal(w)).toBe(2)
    })
})
